import { useNavigate } from 'react-router-dom';
import './UpcomingSessionCard.css';

const UpcomingSessionCard = ({ 
  session, 
  variant = 'default', // 'default', 'compact', or 'horizontal'
  showRoleLabel = false,
  userRole = 'interviewer' // 'interviewer' or 'interviewee'
}) => {
  const navigate = useNavigate();

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSessionAction = (sessionId) => {
    navigate(`/sessions/${sessionId}`);
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      SCHEDULED: 'status-scheduled',
      LIVE: 'status-live',
    };
    return statusMap[status] || 'status-default';
  };

  const getActionButtonText = (status) => {
    return status === 'LIVE' ? 'Join Session' : 'View Session';
  };

  const getActionButtonClass = (status) => {
    return status === 'LIVE' ? 'join-btn live' : 'view-btn';
  };

  // Extract session data based on user role
  const scheduledTime = session.requestId?.scheduledAt;
  const interviewType = session.requestId?.interviewTypes?.join(', ') || 'Not specified';
  const difficulty = session.requestId?.difficulty || 'Not specified';
  const duration = session.requestId?.duration || 60;
  const requiredSkills = session.requestId?.skills || [];

  // Role-specific data
  const participantName = userRole === 'interviewer' 
    ? (session.intervieweeId?.name || 'Interviewee')
    : (session.interviewerId?.name || 'Interviewer');
  
  const participantSkills = userRole === 'interviewer' 
    ? (session.requestId?.skills || [])
    : requiredSkills; // For interviewees, show required skills instead of interviewer skills

  const skillsLabel = userRole === 'interviewer' ? 'Interviewee Skills' : 'Required Skills';
  const roleLabel = userRole === 'interviewer' ? 'You are the Interviewer' : 'You are the Interviewee';
  const sessionTitle = userRole === 'interviewer' 
    ? participantName 
    : `Interview with ${participantName}`;

  return (
    <div className={`upcoming-session-card ${variant}`}>
      {variant === 'horizontal' ? (
        // Horizontal layout for dashboard "Next Upcoming Session"
        <div className="session-card-horizontal">
          {/* Upper section: Interviewer name, status, and date */}
          <div className="session-upper-section">
            <div className="session-title-row">
              <h3 className="session-title">{sessionTitle}</h3>
              <span className={`status-badge ${getStatusBadgeClass(session.status)}`}>
                {session.status}
              </span>
            </div>
            <p className="session-time">{formatDateTime(scheduledTime)}</p>
          </div>
          
          {/* Lower section: Other details in horizontal layout */}
          <div className="session-lower-section">
            <div className="details-horizontal-row">
              <span className="detail-compact">
                <strong>Type:</strong> {interviewType}
              </span>
              <span className="detail-compact">
                <strong>Difficulty:</strong> {difficulty}
              </span>
              <span className="detail-compact">
                <strong>Duration:</strong> {duration} min
              </span>
            </div>
            
            {participantSkills.length > 0 && (
              <div className="skills-horizontal-row">
                <span className="skills-label-compact">{skillsLabel}:</span>
                <div className="skills-chips-compact">
                  {participantSkills.map((skill, index) => (
                    <span key={index} className="skill-chip-compact">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="action-section">
              <button
                className={`action-btn ${getActionButtonClass(session.status)}`}
                onClick={() => handleSessionAction(session._id)}
              >
                {getActionButtonText(session.status)}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Original vertical layout for other variants
        <>
          <div className="session-card-header">
            <div className="session-info">
              <h3 className="interviewee-name">{sessionTitle}</h3>
              <p className="session-time">{formatDateTime(scheduledTime)}</p>
              {showRoleLabel && (
                <span className="role-label">{roleLabel}</span>
              )}
            </div>
            <div className="session-status">
              <span className={`status-badge ${getStatusBadgeClass(session.status)}`}>
                {session.status}
              </span>
            </div>
          </div>

          <div className="session-card-details">
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Interview Type:</span>
                <span className="detail-value">{interviewType}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Difficulty:</span>
                <span className="detail-value">{difficulty}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">{duration} minutes</span>
              </div>
            </div>

            {participantSkills.length > 0 ? (
              <div className="skills-section">
                <span className="skills-label">{skillsLabel}:</span>
                <div className="skills-chips">
                  {participantSkills.map((skill, index) => (
                    <span key={index} className="skill-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="skills-section">
                <span className="skills-label">{skillsLabel}:</span>
                <span className="no-skills-message">No skills information available</span>
              </div>
            )}
          </div>
          
          <div className="session-card-actions">
            <button
              className={`action-btn ${getActionButtonClass(session.status)}`}
              onClick={() => handleSessionAction(session._id)}
            >
              {getActionButtonText(session.status)}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UpcomingSessionCard;