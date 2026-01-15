import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { interviewRequestService } from '../services/interviewRequestService';
import socket from '../sockets/socket';
import StatCard from '../components/StatCard';
import MyUpcomingSessionsPreview from '../components/MyUpcomingSessionsPreview';
import UpcomingSessionsPreview from '../components/UpcomingSessionsPreview';
import UpcomingSessionCard from '../components/UpcomingSessionCard';
import CompletedSessionsPreview from '../components/CompletedSessionsPreview';
import FeedbackReminderBanner from '../components/FeedbackReminderBanner';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentRequests, setRecentRequests] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [nextUpcomingSession, setNextUpcomingSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [completedSessionsWithoutFeedback, setCompletedSessionsWithoutFeedback] = useState([]);
  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);

  const isInterviewee = user?.roles?.includes('INTERVIEWEE');
  const isInterviewer = user?.roles?.includes('INTERVIEWER');
  const isAdmin = user?.roles?.includes('ADMIN');

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Socket listener for real-time session updates (interviewees only)
  useEffect(() => {
    if (!isInterviewee || !user) return;

    // Set up socket authentication
    socket.auth = {
      token: localStorage.getItem("token")
    };

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Listen for new session created events
    const handleSessionCreated = (sessionData) => {
      console.log('📥 Session created event received:', sessionData);
      
      // Check if this event is for the current user
      if (sessionData.intervieweeId === user._id) {
        console.log('✅ New session created for current user, refreshing upcoming sessions');
        
        // Refresh the next upcoming session
        fetchNextUpcomingSession();
      }
    };

    socket.on('session-created', handleSessionCreated);

    // Cleanup on unmount
    return () => {
      socket.off('session-created', handleSessionCreated);
    };
  }, [isInterviewee, user]);

  const fetchNextUpcomingSession = async () => {
    if (!isInterviewee) return;
    
    try {
      const sessions = await dashboardService.getIntervieweeSessions(1);
      setNextUpcomingSession(sessions && sessions.length > 0 ? sessions[0] : null);
    } catch (err) {
      console.error('Error fetching next upcoming session:', err);
      setNextUpcomingSession(null);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch data based on user roles
      let myRequestsData = [];
      let openRequestsData = [];
      let questionsData = [];

      if (isInterviewee || isInterviewer) {
        myRequestsData = await dashboardService.getMyRequests();
      }

      if (isInterviewer) {
        openRequestsData = await dashboardService.getOpenRequests();
      }

      if (isAdmin) {
        questionsData = await dashboardService.getQuestions();
      }

      // Fetch next upcoming session for interviewee from API
      if (isInterviewee) {
        await fetchNextUpcomingSession();
      }

      // Calculate stats
      calculateStats(myRequestsData, questionsData);
      
      // Process requests and sessions
      processRequestsAndSessions(myRequestsData, openRequestsData);

      // Fetch questions for admin
      if (isAdmin) {
        setQuestions(questionsData);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (requests, questions) => {
    const newStats = {};

    if (isInterviewee) {
      // Stats computed from interview requests API
      const totalRequests = requests.length;
      const pendingRequests = requests.filter(r => 
        (r.status === 'OPEN' || r.status === 'PENDING') && !r.isExpired
      ).length;

      // Completed Interviews = Interviews Given + Interviews Taken (from user model)
      const interviewsGiven = user.stats?.interviewsGiven || 0;
      const interviewsTaken = user.stats?.interviewsTaken || 0;
      const completedInterviews = interviewsGiven + interviewsTaken;

      newStats.totalRequests = totalRequests;
      newStats.completedInterviews = completedInterviews;
      newStats.pendingInterviews = pendingRequests;
    }

    if (isInterviewer) {
      // Stats fetched directly from user model (already available in user.stats)
      newStats.interviewsTaken = user.stats?.interviewsTaken || 0;
      newStats.interviewsGiven = user.stats?.interviewsGiven || 0;
      newStats.averageRating = user.stats?.rating || 0;
      
      // Completed Interviews = Interviews Given + Interviews Taken (from user model)
      const completedInterviews = newStats.interviewsGiven + newStats.interviewsTaken;
      newStats.completedInterviews = completedInterviews;
      
      // Only compute upcoming interviews from requests
      const acceptedRequests = requests.filter(r => 
        r.status === 'ACCEPTED' && r.acceptedBy?.toString() === user._id
      );
      const upcomingCount = acceptedRequests.filter(r => {
        const scheduledTime = new Date(r.scheduledAt);
        return scheduledTime > new Date();
      }).length;
      newStats.upcomingInterviews = upcomingCount;
    }

    if (isAdmin) {
      const totalQuestions = questions.length;
      const activeQuestions = questions.filter(q => !q.deletedAt).length;
      const deletedQuestions = questions.filter(q => q.deletedAt).length;

      newStats.totalQuestions = totalQuestions;
      newStats.activeQuestions = activeQuestions;
      newStats.deletedQuestions = deletedQuestions;
    }

    setStats(newStats);
  };

  const processRequestsAndSessions = (myRequests, openRequests) => {
    const now = new Date();

    if (isInterviewee) {
      // Get recent requests (last 5)
      const recent = myRequests
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentRequests(recent);

      // Find upcoming sessions from accepted requests
      const upcoming = myRequests
        .filter(r => r.status === 'ACCEPTED' && new Date(r.scheduledAt) > now)
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
        .slice(0, 1);
      setUpcomingSessions(upcoming);
    }

    if (isInterviewer) {
      // Get open requests preview (last 5)
      const open = openRequests
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setOpenRequests(open);

      // Get upcoming sessions from accepted requests
      const upcoming = myRequests
        .filter(r => 
          r.status === 'ACCEPTED' && 
          r.acceptedBy?.toString() === user._id &&
          new Date(r.scheduledAt) > now
        )
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
        .slice(0, 2);
      setUpcomingSessions(upcoming);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status, isExpired) => {
    if (isExpired) return 'status-expired';
    const statusMap = {
      OPEN: 'status-open',
      ACCEPTED: 'status-accepted',
      EXPIRED: 'status-expired',
    };
    return statusMap[status] || 'status-default';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAcceptRequest = async (requestId) => {
    if (acceptingRequest) return; // Prevent multiple clicks
    
    setAcceptingRequest(requestId);
    try {
      await interviewRequestService.acceptRequest(requestId);
      // Refresh dashboard data to reflect changes
      await fetchDashboardData();
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept interview request. Please try again.');
    } finally {
      setAcceptingRequest(null);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (deletingRequest) return; // Prevent multiple clicks
    
    const confirmed = window.confirm('Are you sure you want to delete this interview request? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingRequest(requestId);
    try {
      await interviewRequestService.deleteRequest(requestId);
      // Refresh dashboard data to reflect changes
      await fetchDashboardData();
    } catch (error) {
      console.error('Error deleting request:', error);
      // Since delete endpoint might not exist, just show a message
      alert('Delete functionality is not available yet. Please contact support if you need to cancel a request.');
    } finally {
      setDeletingRequest(null);
    }
  };

  const handleEditRequest = (requestId) => {
    // For now, navigate to create page with edit mode
    // In a full implementation, you'd create an edit page or pass edit mode to create page
    navigate(`/create-interview?edit=${requestId}`);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-left">
            <div>
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="dashboard-subtitle">Welcome back, {user?.name}</p>
            </div>
          </div>
          <div className="dashboard-header-actions">
            <div className="role-badges">
              {user?.roles?.map((role, index) => (
                <span key={index} className="role-badge">{role}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="dashboard-stats">
        {isInterviewee && (
          <>
            <StatCard
              title="Total Requests"
              value={loading ? '...' : (stats.totalRequests || 0)}
              icon="📋"
              color="blue"
            />
            <StatCard
              title="Completed Interviews"
              value={loading ? '...' : (stats.completedInterviews || 0)}
              icon="✅"
              color="green"
            />
            <StatCard
              title="Pending Interviews"
              value={loading ? '...' : (stats.pendingInterviews || 0)}
              icon="⏳"
              color="orange"
            />
          </>
        )}

        {isInterviewer && (
          <>
            <StatCard
              title="Interviews Given"
              value={loading ? '...' : (stats.interviewsGiven || 0)}
              icon="👥"
              color="blue"
            />
            <StatCard
              title="Interviews Taken"
              value={loading ? '...' : (stats.interviewsTaken || 0)}
              icon="📝"
              color="green"
            />
            <StatCard
              title="Average Rating"
              value={loading ? '...' : (stats.averageRating ? stats.averageRating.toFixed(1) : '0.0')}
              icon="⭐"
              color="orange"
            />
          </>
        )}

        {isAdmin && (
          <>
            <StatCard
              title="Total Questions"
              value={loading ? '...' : (stats.totalQuestions || 0)}
              icon="❓"
              color="blue"
            />
            <StatCard
              title="Active Questions"
              value={loading ? '...' : (stats.activeQuestions || 0)}
              icon="✅"
              color="green"
            />
            <StatCard
              title="Deleted Questions"
              value={loading ? '...' : (stats.deletedQuestions || 0)}
              icon="🗑️"
              color="orange"
            />
          </>
        )}
      </div>

      {/* Next Upcoming Session Card - for interviewee, use API data; for others, use request data */}
      {isInterviewee ? (
        nextUpcomingSession && (
          <div className="dashboard-section">
            <h2 className="section-title">Next Upcoming Session</h2>
            <UpcomingSessionCard
              session={nextUpcomingSession}
              variant="horizontal"
              showRoleLabel={false}
              userRole="interviewee"
            />
          </div>
        )
      ) : (
        upcomingSessions.length > 0 && (
          <div className="dashboard-section">
            <h2 className="section-title">Next Upcoming Session </h2>
            <div className="upcoming-session-card">
              {upcomingSessions[0] && (
                <div className="session-preview">
                  <div className="session-preview-info">
                    <h3>
                      {isInterviewer 
                        ? `Interview with ${upcomingSessions[0].createdBy?.name || 'Interviewee'}`
                        : 'Your Interview'}
                    </h3>
                    <p className="session-time">
                      {formatDate(upcomingSessions[0].scheduledAt)}
                    </p>
                    <div className="session-details">
                      <span className="session-skill">{upcomingSessions[0].skills?.join(', ') || 'N/A'}</span>
                      <span className={`session-status ${getStatusBadgeClass(upcomingSessions[0].status, upcomingSessions[0].isExpired)}`}>
                        {upcomingSessions[0].isExpired ? 'EXPIRED' : upcomingSessions[0].status}
                      </span>
                    </div>
                  </div>
                  {upcomingSessions[0].linkedInterviewSessionId && (
                    <button 
                      className="join-session-btn"
                      onClick={() => navigate(`/sessions/${upcomingSessions[0].linkedInterviewSessionId}`)}
                    >
                      View Session
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Feedback Reminder Banner (role-agnostic) */}
      <div className="dashboard-section">
        <FeedbackReminderBanner />
      </div>

      {/* Role-Specific Sections */}
      {isInterviewee && (
        <>
          {/* Upcoming Sessions Preview */}
          <div className="dashboard-section">
            <UpcomingSessionsPreview />
          </div>

          {/* Primary CTA */}
          <div className="dashboard-section cta-section">
            <button 
              className="primary-cta-btn"
              onClick={() => navigate('/create-interview')}
            >
              Request a Mock Interview
            </button>
          </div>

          {/* Recent Interview Requests */}
          {recentRequests.length > 0 && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Recent Interview Requests</h2>
                <button 
                  className="view-all-btn"
                  onClick={() => navigate('/all-requests')}
                >
                  View All
                </button>
              </div>
              <div className="requests-list">
                {recentRequests.map((request) => (
                  <div key={request._id} className="request-item">
                    <div className="request-info">
                      <h4>{request.skills?.join(', ')}</h4>
                      <p className="request-meta">
                        {request.difficulty} • {formatDate(request.scheduledAt)}
                      </p>
                      <p className="request-details">
                        Duration: {request.duration || 60} minutes
                      </p>
                      
                      {/* Participant Information */}
                      <div className="participant-info">
                        <div className="participant-item">
                          <span className="participant-label">Interviewee:</span>
                          <span className="participant-name">
                            {request.createdBy?.name || 'You'}
                          </span>
                        </div>
                        <div className="participant-item">
                          <span className="participant-label">Interviewer:</span>
                          <span className="participant-name">
                            {request.status === 'ACCEPTED' && request.acceptedBy?.name 
                              ? request.acceptedBy.name
                              : request.status === 'OPEN' && !request.isExpired
                              ? 'Awaiting interviewer'
                              : request.isExpired
                              ? 'Request expired'
                              : 'Not assigned'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="request-item-footer">
                      <span className={`request-status ${getStatusBadgeClass(request.status, request.isExpired)}`}>
                        {request.isExpired ? 'EXPIRED' : request.status}
                      </span>
                      <div className="request-actions">
                        {request.status === 'OPEN' && !request.isExpired && (
                          <>
                            <button 
                              className="edit-btn"
                              onClick={() => handleEditRequest(request._id)}
                              title="Edit Request"
                            >
                              ✏️
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteRequest(request._id)}
                              disabled={deletingRequest === request._id}
                              title="Delete Request"
                            >
                              {deletingRequest === request._id ? '⏳' : '🗑️'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Reminder */}
          {completedSessionsWithoutFeedback.length > 0 && (
            <div className="dashboard-section">
              <div className="feedback-reminder-banner">
                <span className="reminder-icon">💬</span>
                <div className="reminder-content">
                  <h3>Feedback Reminder</h3>
                  <p>You have {completedSessionsWithoutFeedback.length} completed session(s) without feedback.</p>
                </div>
                <button 
                  className="reminder-btn"
                  onClick={() => navigate('/completed-sessions')}
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isInterviewer && (
        <>
          {/* My Upcoming Sessions Preview */}
          <div className="dashboard-section">
            <MyUpcomingSessionsPreview />
          </div>

          {/* Open Interview Requests Preview */}
          {openRequests.length > 0 && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Open Interview Requests</h2>
                <button 
                  className="view-all-btn"
                  onClick={() => navigate('/open-requests')}
                >
                  View All Open Requests
                </button>
              </div>
              <div className="requests-list">
                {openRequests.map((request) => (
                  <div key={request._id} className="request-item open-request-card">
                    <div className="request-info">
                      <h4>{request.skills?.join(', ')}</h4>
                      <div className="request-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Type:</span>
                          <span className="detail-value">
                            {request.interviewTypes?.join(', ') || 'Not specified'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Difficulty:</span>
                          <span className="detail-value">{request.difficulty}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Scheduled:</span>
                          <span className="detail-value">{formatDate(request.scheduledAt)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Duration:</span>
                          <span className="detail-value">{request.duration || 60} minutes</span>
                        </div>
                      </div>

                      {/* Skills Section */}
                      {request.createdBy?.skills && request.createdBy.skills.length > 0 && (
                        <div className="skills-section">
                          <div className="skill-group">
                            <span className="skill-group-label">Interviewee Skills:</span>
                            <div className="skill-chips">
                              {request.createdBy.skills.map((skill, index) => (
                                <span key={index} className="skill-chip interviewee-skill">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="request-item-footer">
                      <span className={`request-status ${getStatusBadgeClass(request.status, request.isExpired)}`}>
                        {request.status}
                      </span>
                      {/* Only show Accept button if user is interviewer AND didn't create the request */}
                      {isInterviewer && 
                       !request.isExpired && 
                       request.status === 'OPEN' &&
                       String(request.createdBy?._id) !== String(user._id) && (
                        <button 
                          className="accept-btn"
                          onClick={() => handleAcceptRequest(request._id)}
                          disabled={acceptingRequest === request._id}
                        >
                          {acceptingRequest === request._id ? 'Accepting...' : 'Accept'}
                        </button>
                      )}
                      {/* Show notice if user created this request */}
                      {String(request.createdBy?._id) === String(user._id) && (
                        <div className="own-request-notice">
                          Your request
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Completed Sessions Preview (single rendering for interviewer or interviewee) */}
      {(isInterviewee || isInterviewer) && (
        <div className="dashboard-section">
          <CompletedSessionsPreview />
        </div>
      )}

      {isAdmin && (
        <div className="dashboard-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions">
            <button 
              className="action-btn"
              onClick={() => navigate('/questions/add')}
            >
              Add Question
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/questions')}
            >
              Manage Questions
            </button>
          </div>
        </div>
      )}

      {/* Empty States */}
      {!loading && recentRequests.length === 0 && isInterviewee && (
        <div className="empty-state">
          <p>No interview requests yet. Create your first request to get started!</p>
        </div>
      )}

      {!loading && openRequests.length === 0 && isInterviewer && (
        <div className="empty-state">
          <p>No open interview requests at the moment.</p>
        </div>
      )}

      {/* Navigation Links */}
      <div className="dashboard-section">
        <h2 className="section-title">Quick Navigation</h2>
        <div className="navigation-links">
          {(() => {
            const links = [];
            const addLink = (key, label, path, primary = false) => {
              if (!links.find(l => l.key === key)) {
                links.push({ key, label, path, primary });
              }
            };

            if (isInterviewee) {
              addLink('create-interview', 'Create Interview Request', '/create-interview', true);
              addLink('all-requests', 'View All My Requests', '/all-requests');
              addLink('completed-sessions', 'Completed Sessions', '/completed-sessions');
            }

            if (isInterviewer) {
              addLink('open-requests', 'Browse Open Requests', '/open-requests', true);
              addLink('interviewer-sessions', 'My Upcoming Sessions', '/interviewer/upcoming-sessions');
              addLink('all-requests', 'All Requests', '/all-requests');
              addLink('my-sessions', 'My Sessions', '/upcoming-sessions');
              addLink('completed-sessions', 'Completed Sessions', '/completed-sessions');
            }

            if (isAdmin) {
              addLink('questions', 'Question Management', '/questions');
            }

            return links.map(link => (
              <button
                key={link.key}
                onClick={() => navigate(link.path)}
                className={`nav-link-btn ${link.primary ? 'primary' : ''}`}
              >
                {link.label}
              </button>
            ));
          })()}
        </div>
      </div>

      
    </div>
  );
};

export default Dashboard;