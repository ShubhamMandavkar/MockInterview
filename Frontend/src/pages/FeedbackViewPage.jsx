import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import FeedbackCard from '../components/FeedbackCard';
import './FeedbackViewPage.css';

const FeedbackViewPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id?.toString();

  const [session, setSession] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const sessionData = await dashboardService.getSessionById(sessionId);
        if (sessionData.status !== 'COMPLETED') {
          setError('Feedback is available only after session is completed.');
          setLoading(false);
          return;
        }

        const participantIds = [
          sessionData.interviewerId?._id?.toString() || sessionData.interviewerId?.toString(),
          sessionData.intervieweeId?._id?.toString() || sessionData.intervieweeId?.toString(),
        ];
        if (!participantIds.includes(userId)) {
          setError('You do not have access to this session feedback.');
          setLoading(false);
          return;
        }

        setSession(sessionData);

        const feedbackList = await dashboardService.getSessionFeedback(sessionId);
        setFeedbacks(feedbackList || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load feedback.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId, userId]);

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

  if (loading) {
    return (
      <div className="feedback-view-page">
        <div className="feedback-view-card">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-view-page">
        <div className="feedback-view-card">
          <div className="error-state">
            <p>{error}</p>
            <button className="back-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="feedback-view-page">
        <div className="feedback-view-card">
          <div className="error-state">
            <p>Session not found.</p>
            <button className="back-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const sessionInterviewerId = session.interviewerId?._id?.toString() || session.interviewerId?.toString();
  const sessionIntervieweeId = session.intervieweeId?._id?.toString() || session.intervieweeId?.toString();
  const isUserInterviewer = userId === sessionInterviewerId;
  const userRoleLabel = isUserInterviewer ? 'Interviewer' : 'Interviewee';

  const feedbackGivenByUser = Array.isArray(feedbacks)
    ? feedbacks.find(f => f.givenBy?._id?.toString() === userId || f.givenBy?.toString() === userId)
    : null;

  const feedbackGivenToUser = Array.isArray(feedbacks)
    ? feedbacks.find(f => f.givenTo?._id?.toString() === userId || f.givenTo?.toString() === userId)
    : null;

  const interviewDate = session.requestId?.scheduledAt || session.createdAt;

  return (
    <div className="feedback-view-page">
      <div className="feedback-view-card">
        <div className="feedback-view-header">
          <div>
            <h1>Interview Feedback</h1>
            <p>{formatDateTime(interviewDate)}</p>
          </div>
          <div className="role-badge">{userRoleLabel}</div>
        </div>

        <div className="feedback-sections">
          <div className="feedback-section">
            <h2>Feedback Given TO You</h2>
            {feedbackGivenToUser ? (
              <FeedbackCard
                title="Feedback Received"
                feedback={feedbackGivenToUser}
                roleLabel={feedbackGivenToUser.givenBy?._id?.toString() === sessionInterviewerId ? 'Interviewer' : 'Interviewee'}
              />
            ) : (
              <div className="empty-state">
                <p>Waiting for the other participant’s feedback.</p>
              </div>
            )}
          </div>

          <div className="feedback-section">
            <h2>Feedback You Gave</h2>
            {feedbackGivenByUser ? (
              <FeedbackCard
                title="Feedback Submitted"
                feedback={feedbackGivenByUser}
                roleLabel={isUserInterviewer ? 'Interviewer' : 'Interviewee'}
              />
            ) : (
              <div className="empty-state">
                <p>You have not submitted feedback yet.</p>
                <button
                  className="submit-feedback-btn"
                  onClick={() => navigate(`/feedback/${sessionId}`)}
                >
                  Submit Feedback
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="footer-actions">
          <button className="back-btn ghost" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackViewPage;


