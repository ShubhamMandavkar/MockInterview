import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import UpcomingSessionCard from '../components/UpcomingSessionCard';
import './InterviewerUpcomingSessions.css';

//Render all the interviewer's sessions
const InterviewerUpcomingSessions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isInterviewer = user?.roles?.includes('INTERVIEWER');

  useEffect(() => {
    // Redirect if user is not an interviewer
    if (!isInterviewer) {
      navigate('/dashboard');
      return;
    }

    fetchUpcomingSessions();
  }, [isInterviewer, navigate]);

  const fetchUpcomingSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all interviewer sessions
      const allSessions = await dashboardService.getInterviewerSessions();
      
      // Filter for SCHEDULED and LIVE sessions only
      const upcomingSessions = allSessions.filter(session => 
        session.status === 'SCHEDULED' || session.status === 'LIVE'
      );
      
      // Sort by scheduled time ascending
      upcomingSessions.sort((a, b) => {
        const timeA = new Date(a.requestId?.scheduledAt || a.createdAt);
        const timeB = new Date(b.requestId?.scheduledAt || b.createdAt);
        return timeA - timeB;
      });
      
      setSessions(upcomingSessions);
    } catch (err) {
      console.error('Error fetching upcoming sessions:', err);
      setError('Failed to load upcoming sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if user is not an interviewer
  if (!isInterviewer) {
    return null;
  }

  if (loading) {
    return (
      <div className="interviewer-sessions-container">
        <div className="page-header">
          <h1 className="page-title">My Upcoming Sessions  (As Interviewer)</h1>
          <p className="page-subtitle">All interview sessions you have accepted</p>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your upcoming sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="interviewer-sessions-container">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1 className="page-title">My Upcoming Sessions  (As Interviewer)</h1>
          <p className="page-subtitle">All interview sessions you have accepted</p>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Sessions</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchUpcomingSessions}>
            Try Again
          </button>
        </div>
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div className="interviewer-sessions-container">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1 className="page-title">My Upcoming Sessions  (As Interviewer)</h1>
          <p className="page-subtitle">All interview sessions you have accepted</p>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Upcoming Sessions</h3>
          <p>You don't have any upcoming interview sessions at the moment.</p>
          <button 
            className="browse-btn"
            onClick={() => navigate('/open-requests')}
          >
            Browse Open Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interviewer-sessions-container">
      <div className="page-header">
        <h1 className="page-title">My Upcoming Sessions  (As Interviewer)</h1>
        <p className="page-subtitle">
          {sessions.length} upcoming session{sessions.length !== 1 ? 's' : ''} you have accepted
        </p>
      </div>

      <div className="sessions-list">
        {sessions.map((session) => (
          <UpcomingSessionCard
            key={session._id}
            session={session}
            variant="default"
            showRoleLabel={true}
            userRole="interviewer"
          />
        ))}
      </div>
    </div>
  );
};

export default InterviewerUpcomingSessions;