import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import socket from '../sockets/socket';
import UpcomingSessionCard from './UpcomingSessionCard';
import './UpcomingSessionsPreview.css';

//Renders Interviewee's upcoming session previews
const UpcomingSessionsPreview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isInterviewee = user?.roles?.includes('INTERVIEWEE');

  useEffect(() => {
    if (!isInterviewee) {
      setLoading(false);
      return;
    }

    fetchSessions();
  }, [isInterviewee]);

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
      console.log('📥 Session created event received in UpcomingSessionsPreview:', sessionData);
      
      // Check if this event is for the current user
      if (sessionData.intervieweeId === user._id) {
        console.log('✅ New session created for current user, refreshing upcoming sessions preview');
        
        // Refresh sessions
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
      // Fetch 5 sessions for preview (skip the first one as it's shown in "Next Upcoming Session")
      const data = await dashboardService.getIntervieweeSessions(6);
      // Skip the first session (nearest one) to avoid duplication with "Next Upcoming Session"
      setSessions(data && data.length > 1 ? data.slice(1, 6) : []);
    } catch (err) {
      console.error('Error fetching interviewee sessions:', err);
      setError('Failed to load upcoming sessions');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if user is not an interviewee
  if (!isInterviewee) {
    return null;
  }

  if (loading) {
    return (
      <div className="upcoming-sessions-preview">
        <div className="section-header">
          <h2 className="section-title">Upcoming Sessions (As Interviewee)</h2>
        </div>
        <div className="loading-state">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="upcoming-sessions-preview">
        <div className="section-header">
          <h2 className="section-title">Upcoming Sessions (As Interviewee) </h2>
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
          <h2 className="section-title">Upcoming Sessions (As Interviewee)</h2>
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
        <h2 className="section-title">Upcoming Sessions (As Interviewee)</h2>
        <button 
          className="view-all-btn"
          onClick={() => navigate('/upcoming-sessions')}
        >
          View All Upcoming Sessions
        </button>
      </div>
      <div className="sessions-list">
        {sessions.map((session) => (
          <UpcomingSessionCard
            key={session._id}
            session={session}
            variant="compact"
            showRoleLabel={false}
            userRole="interviewee"
          />
        ))}
      </div>
    </div>
  );
};

export default UpcomingSessionsPreview;

