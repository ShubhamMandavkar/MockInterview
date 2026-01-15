import { useNavigate } from 'react-router-dom';
import './SessionCard.css';

const SessionCard = ({ session, role, showJoinButton = false }) => {
  const navigate = useNavigate();

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

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      SCHEDULED: 'status-scheduled',
      LIVE: 'status-live',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
    };
    return statusMap[status] || 'status-default';
  };

  const handleJoinSession = () => {
    if (session.status === 'LIVE') {
      navigate(`/sessions/${session._id}`);
    }
  };

  const otherParticipant = role === 'INTERVIEWER' 
    ? session.intervieweeId 
    : session.interviewerId;

  return (
    <div className="session-card">
      <div className="session-card-header">
        <div className="session-card-info">
          <h3 className="session-card-title">
            {role === 'INTERVIEWER' ? 'Interviewing' : 'Interview with'} {otherParticipant?.name || 'Unknown'}
          </h3>
          <span className={`status-badge ${getStatusBadgeClass(session.status)}`}>
            {session.status}
          </span>
        </div>
      </div>
      
      <div className="session-card-body">
        <div className="session-card-detail">
          <span className="detail-label">Scheduled:</span>
          <span className="detail-value">{formatDate(session.createdAt)}</span>
        </div>
        {session.duration && (
          <div className="session-card-detail">
            <span className="detail-label">Duration:</span>
            <span className="detail-value">{session.duration} minutes</span>
          </div>
        )}
      </div>

      {showJoinButton && session.status === 'LIVE' && (
        <div className="session-card-footer">
          <button className="join-session-btn" onClick={handleJoinSession}>
            Join Session
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionCard;

