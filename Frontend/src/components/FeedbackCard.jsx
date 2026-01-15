import './FeedbackCard.css';

const FeedbackCard = ({ title, feedback, roleLabel }) => {
  if (!feedback) {
    return null;
  }

  return (
    <div className="feedback-card">
      <div className="feedback-card-header">
        <div>
          <h3 className="feedback-card-title">{title}</h3>
          <p className="feedback-card-subtitle">
            Given by: {feedback.givenBy?.name || 'Participant'} {roleLabel ? `(${roleLabel})` : ''}
          </p>
        </div>
      </div>
      <div className="feedback-ratings">
        <div className="rating-item">
          <span className="rating-label">Technical</span>
          <span className="rating-value">{feedback.ratings?.technical ?? '—'}</span>
        </div>
        <div className="rating-item">
          <span className="rating-label">Communication</span>
          <span className="rating-value">{feedback.ratings?.communication ?? '—'}</span>
        </div>
        <div className="rating-item">
          <span className="rating-label">Problem Solving</span>
          <span className="rating-value">{feedback.ratings?.problemSolving ?? '—'}</span>
        </div>
      </div>
      {feedback.comments && (
        <div className="feedback-comments">
          <div className="comments-label">Comments</div>
          <p className="comments-text">{feedback.comments}</p>
        </div>
      )}
    </div>
  );
};

export default FeedbackCard;

