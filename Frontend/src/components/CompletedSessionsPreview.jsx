import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import './CompletedSessionsPreview.css';

const CompletedSessionsPreview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isInterviewee = user?.roles?.includes('INTERVIEWEE');
  const isInterviewer = user?.roles?.includes('INTERVIEWER');

  useEffect(() => {
    if (!isInterviewee && !isInterviewer) {
      setLoading(false);
      return;
    }

    fetchSessions();
  }, [isInterviewee, isInterviewer]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch 3 most recent completed sessions
      const data = await dashboardService.getCompletedSessions();
      // Sort by endedAt or createdAt descending and limit to 3
      const sorted = (data || [])
        .sort((a, b) => {
          const timeA = new Date(a.endedAt || a.createdAt);
          const timeB = new Date(b.endedAt || b.createdAt);
          return timeB - timeA;
        })
        .slice(0, 3);
      setSessions(sorted);
    } catch (err) {
      console.error('Error fetching completed sessions:', err);
      setError('Failed to load completed sessions');
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

  const handleViewSession = (sessionId) => {
    navigate(`/sessions/${sessionId}`);
  };

  // Don't render if user is not an interviewee or interviewer
  if (!isInterviewee && !isInterviewer) {
    return null;
  }

  if (loading) {
    return (
      <div className="completed-sessions-preview">
        <div className="section-header">
          <h2 className="section-title">Completed Sessions</h2>
        </div>
        <div className="loading-state">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="completed-sessions-preview">
        <div className="section-header">
          <h2 className="section-title">Completed Sessions</h2>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchSessions} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="completed-sessions-preview">
        <div className="section-header">
          <h2 className="section-title">Completed Sessions</h2>
        </div>
        <div className="empty-state">
          <p>No completed sessions yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="completed-sessions-preview">
      <div className="section-header">
        <h2 className="section-title">Completed Sessions</h2>
        <button 
          className="view-all-btn"
          onClick={() => navigate('/completed-sessions')}
        >
          View All Completed Sessions
        </button>
      </div>
      <div className="sessions-list">
        {sessions.map((session) => {
          const scheduledTime = session.requestId?.scheduledAt || session.createdAt;
          const interviewerName = session.interviewerId?.name || 'Interviewer';
          const intervieweeName = session.intervieweeId?.name || 'Interviewee';
          
          // Determine which name to show based on user's role
          const userId = user?._id?.toString();
          const sessionInterviewerId = session.interviewerId?._id?.toString() || session.interviewerId?.toString();
          const isSessionInterviewer = userId === sessionInterviewerId;
          
          return (
            <div key={session._id} className="session-card">
              <div className="session-card-content">
                <div className="session-card-header">
                  <h3 className="session-name">
                    {isSessionInterviewer 
                      ? `Interview with ${intervieweeName}`
                      : `Interview with ${interviewerName}`}
                  </h3>
                  <span className="session-status-badge status-completed">
                    COMPLETED
                  </span>
                </div>
                <div className="session-card-details">
                  <div className="session-detail-item">
                    <span className="detail-label">Scheduled:</span>
                    <span className="detail-value">{formatDateTime(scheduledTime)}</span>
                  </div>
                </div>
              </div>
              <div className="session-card-actions">
                <button
                  className="view-session-button"
                  onClick={() => handleViewSession(session._id)}
                >
                  View Session
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompletedSessionsPreview;


