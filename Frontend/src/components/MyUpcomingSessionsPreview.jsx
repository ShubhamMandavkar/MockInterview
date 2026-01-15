import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import UpcomingSessionCard from './UpcomingSessionCard';
import './MyUpcomingSessionsPreview.css';

// Renders interviewer's upcoming sessions previews
const MyUpcomingSessionsPreview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isInterviewer = user?.roles?.includes('INTERVIEWER');

  useEffect(() => {
    if (!isInterviewer) {
      setLoading(false);
      return;
    }

    fetchSessions();
  }, [isInterviewer]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getInterviewerSessions({ limit: 3 });
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching interviewer sessions:', err);
      setError('Failed to load upcoming sessions');
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
      <div className="upcoming-sessions-preview">
        <div className="section-header">
          <h2 className="section-title">My Upcoming Sessions (As Interviewer)</h2>
        </div>
        <div className="loading-state">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="upcoming-sessions-preview">
        <div className="section-header">
          <h2 className="section-title">My Upcoming Sessions (As Interviewer) </h2>
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
      <div className="upcoming-sessions-preview">
        <div className="section-header">
          <h2 className="section-title">My Upcoming Sessions (As Interviewer)</h2>
        </div>
        <div className="empty-state">
          <p>No upcoming sessions scheduled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upcoming-sessions-preview">
      <div className="section-header">
        <h2 className="section-title">My Upcoming Sessions (As Interviewer) </h2>
        <button 
          className="view-all-btn"
          onClick={() => navigate('/interviewer/upcoming-sessions')}
        >
          View All Sessions
        </button>
      </div>
      <div className="sessions-list">
        {sessions.map((session) => (
          <UpcomingSessionCard
            key={session._id}
            session={session}
            variant="compact"
            showRoleLabel={false}
            userRole="interviewer"
          />
        ))}
      </div>
    </div>
  );
};

export default MyUpcomingSessionsPreview;

