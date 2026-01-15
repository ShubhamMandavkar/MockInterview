import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import './CompletedSessions.css';

const CompletedSessions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isInterviewer = user?.roles?.includes('INTERVIEWER');
  const isInterviewee = user?.roles?.includes('INTERVIEWEE');

  useEffect(() => {
    // Allow both interviewer and interviewee to view completed sessions
    if (!isInterviewer && !isInterviewee) {
      navigate('/dashboard');
      return;
    }
    fetchSessions();
  }, [isInterviewer, isInterviewee, navigate]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getCompletedSessions();
      setSessions(data || []);
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

  return (
    <div className="completed-sessions-page">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Completed Sessions</h1>
        </div>

        {loading && (
          <div className="loading-state">Loading completed sessions...</div>
        )}

        {error && (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchSessions} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {sessions.length === 0 ? (
              <div className="empty-state">
                <p>No completed sessions found.</p>
              </div>
            ) : (
              <div className="sessions-list">
                {sessions.map((session) => {
                  const scheduledTime = session.requestId?.scheduledAt || session.createdAt;
                  const interviewerName = session.interviewerId?.name || 'Interviewer';
                  const intervieweeName = session.intervieweeId?.name || 'Interviewee';
                  
                  // Determine which name to show based on user's role
                  const userId = user?._id?.toString();
                  const sessionInterviewerId = session.interviewerId?._id?.toString() || session.interviewerId?.toString();
                  const sessionIntervieweeId = session.intervieweeId?._id?.toString() || session.intervieweeId?.toString();
                  const isSessionInterviewer = userId === sessionInterviewerId;
                  
                  return (
                    <div key={session._id} className="session-card">
                      <div className="session-card-content">
                        <div className="session-card-header">
                          <h3 className="session-title-row">
                            {isSessionInterviewer ? (
                              <>
                                <span className="name-label">Interviewee:</span> {intervieweeName}
                              </>
                            ) : (
                              <>
                                <span className="name-label">Interviewer:</span> {interviewerName}
                              </>
                            )}
                          </h3>
                          <span className="session-status-badge status-completed">
                            COMPLETED
                          </span>
                        </div>
                        <div className="session-detail-item">
                          {isSessionInterviewer ? (
                            <>
                              <span className="detail-label">Interviewer:</span>
                              <span className="detail-value">You</span>
                            </>
                          ) : (
                            <>
                              <span className="detail-label">Interviewee:</span>
                              <span className="detail-value">You</span>
                            </>
                          )}
                        </div>
                        <div className="session-detail-item">
                          <span className="detail-label">Scheduled:</span>
                          <span className="detail-value">{formatDateTime(scheduledTime)}</span>
                        </div>
                      </div>
                      <div className="session-card-actions">
                        <button
                          className="view-session-button"
                          onClick={() => navigate(`/sessions/${session._id}`)}
                        >
                          View Session
                        </button>
                        <button
                          className="view-session-button"
                          onClick={() => navigate(`/feedback/view/${session._id}`)}
                        >
                          View Feedback
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CompletedSessions;


