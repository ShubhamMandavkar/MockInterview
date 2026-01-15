import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import './FeedbackSubmissionPage.css';

const FeedbackSubmissionPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [ratings, setRatings] = useState({
    technical: 0,
    communication: 0,
    problemSolving: 0,
  });
  const [comments, setComments] = useState('');

  const userId = user?._id?.toString();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch session
        const sessionData = await dashboardService.getSessionById(sessionId);
        setSession(sessionData);

        if (sessionData.status !== 'COMPLETED') {
          setError('Feedback is only available for completed sessions.');
          setLoading(false);
          return;
        }

        // Fetch feedback list
        const feedbackList = await dashboardService.getSessionFeedback(sessionId);
        setFeedbacks(feedbackList || []);

        const hasUserFeedback = Array.isArray(feedbackList)
          ? feedbackList.some(f => f.givenBy?._id?.toString() === userId || f.givenBy?.toString() === userId)
          : false;

        if (hasUserFeedback) {
          setSuccess('You already submitted feedback for this session.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load feedback page.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId, userId]);

  const handleRatingChange = (field, value) => {
    setRatings(prev => ({ ...prev, [field]: Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await dashboardService.submitFeedback({
        sessionId,
        ratings,
        comments,
      });
      setSuccess('Feedback submitted successfully.');
      // After success, redirect to feedback view
      setTimeout(() => navigate(`/feedback/view/${sessionId}`), 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasUserFeedback = Array.isArray(feedbacks)
    ? feedbacks.some(f => f.givenBy?._id?.toString() === userId || f.givenBy?.toString() === userId)
    : false;

  if (loading) {
    return (
      <div className="feedback-page">
        <div className="feedback-card">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-page">
        <div className="feedback-card">
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
      <div className="feedback-page">
        <div className="feedback-card">
          <div className="error-state">
            <p>Session not found.</p>
            <button className="back-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const interviewerName = session.interviewerId?.name || 'Interviewer';
  const intervieweeName = session.intervieweeId?.name || 'Interviewee';

  return (
    <div className="feedback-page">
      <div className="feedback-card">
        <div className="feedback-header">
          <h1>Session Feedback</h1>
          <p>Share quick feedback about this interview.</p>
        </div>

        <div className="session-summary">
          <div className="summary-row">
            <span className="label">Interviewer:</span>
            <span className="value">{interviewerName}</span>
          </div>
          <div className="summary-row">
            <span className="label">Interviewee:</span>
            <span className="value">{intervieweeName}</span>
          </div>
          <div className="summary-row">
            <span className="label">Status:</span>
            <span className="value status-completed">COMPLETED</span>
          </div>
        </div>

        {success && (
          <div className="success-state">
            <p>{success}</p>
          </div>
        )}

        {hasUserFeedback && (
          <div className="info-state">
            <p>You already submitted feedback for this session.</p>
          </div>
        )}

        {!hasUserFeedback && (
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="rating-group">
              <label>Technical</label>
              <select value={ratings.technical} onChange={(e) => handleRatingChange('technical', e.target.value)} required>
                <option value="0" disabled>Select</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="rating-group">
              <label>Communication</label>
              <select value={ratings.communication} onChange={(e) => handleRatingChange('communication', e.target.value)} required>
                <option value="0" disabled>Select</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="rating-group">
              <label>Problem Solving</label>
              <select value={ratings.problemSolving} onChange={(e) => handleRatingChange('problemSolving', e.target.value)} required>
                <option value="0" disabled>Select</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="comments-group">
              <label>Comments (optional)</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share constructive feedback or notes..."
                rows={4}
              />
            </div>

            {error && <div className="error-inline">{error}</div>}

            <button
              type="submit"
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}

        <div className="footer-actions">
          <button className="back-btn ghost" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSubmissionPage;


