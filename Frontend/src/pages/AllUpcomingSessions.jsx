import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import socket from '../sockets/socket';
import './AllUpcomingSessions.css';

const AllUpcomingSessions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isInterviewee = user?.roles?.includes('INTERVIEWEE');

  useEffect(() => {
    if (!isInterviewee) {
      navigate('/dashboard');
      return;
    }

    fetchSessions();
  }, [isInterviewee, navigate]);

  // Socket listener for real-time session updates
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
      console.log('📥 Session created event received in AllUpcomingSessions:', sessionData);
      
      // Check if this event is for the current user
      if (sessionData.intervieweeId === user._id) {
        console.log('✅ New session created for current user, refreshing all upcoming sessions');
        
        // Refresh all sessions
        fetchSessions();
      }
    };

    socket.on('session-created', handleSessionCreated);

    // Cleanup on unmount
    return () => {
      socket.off('session-created', handleSessionCreated);
    };
  }, [isInterviewee, user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all sessions (no limit)
      const data = await dashboardService.getIntervieweeSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching interviewee sessions:', err);
      setError('Failed to load upcoming sessions');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleJoinSession = (sessionId) => {
    navigate(`/sessions/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="all-upcoming-sessions-page">
        <div className="page-container">
          <div className="page-header">
            <h1 className="page-title">All Upcoming Sessions  (As Interviewee)</h1>
          </div>
          <div className="loading-state">Loading sessions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="all-upcoming-sessions-page">
        <div className="page-container">
          <div className="page-header">
            <h1 className="page-title">All Upcoming Sessions  (As Interviewee)</h1>
          </div>
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchSessions} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="all-upcoming-sessions-page">
      <div className="page-container">
        <div className="page-header">
          {/* <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back to Dashboard
          </button> */}
          <h1 className="page-title">All Upcoming Sessions  (As Interviewee)</h1>
          <button 
            onClick={fetchSessions} 
            className="refresh-button"
            disabled={loading}
            title="Refresh sessions"
          >
            {loading ? '⟳' : '↻'} Refresh
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state">
            <p>No upcoming sessions scheduled.</p>
            <button 
              className="primary-btn"
              onClick={() => navigate('/create-interview')}
            >
              Create Interview Request
            </button>
          </div>
        ) : (
          <>
            <div className="sessions-count">
              <p>Showing {sessions.length} upcoming session{sessions.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="sessions-list">
              {sessions.map((session) => {
                const scheduledTime = session.requestId?.scheduledAt;
                const interviewerName = session.interviewerId?.name || 'Interviewer';
                const isLive = session.status === 'LIVE';

                return (
                  <div key={session._id} className="session-card">
                    <div className="session-card-content">
                      <div className="session-card-header">
                        <h3 className="session-interviewer-name">Interview with {interviewerName}</h3>
                        <span className={`session-status-badge ${isLive ? 'status-live' : 'status-scheduled'}`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="session-card-details">
                        <div className="session-detail-item">
                          <span className="detail-label">Scheduled:</span>
                          <span className="detail-value">{formatDateTime(scheduledTime)}</span>
                        </div>
                        {session.duration && (
                          <div className="session-detail-item">
                            <span className="detail-label">Duration:</span>
                            <span className="detail-value">{session.duration} minutes</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="session-card-actions">
                      <button
                        className={`join-session-button ${isLive ? 'enabled' : 'view-enabled'}`}
                        onClick={() => handleJoinSession(session._id)}
                        title={isLive ? 'Join the live session' : 'View session details'}
                      >
                        {isLive ? 'Join Session' : 'View Session'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AllUpcomingSessions;

