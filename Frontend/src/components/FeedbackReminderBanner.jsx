import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import './FeedbackReminderBanner.css';

const FeedbackReminderBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Get most recent completed session (client-side limit)
        const sessions = await dashboardService.getCompletedSessions(1);
        if (!sessions || sessions.length === 0) {
          setSessionId(null);
          return;
        }
        const latest = sessions[0];
        const feedback = await dashboardService.getSessionFeedback(latest._id);
        const userId = user?._id?.toString();
        const hasUserFeedback = Array.isArray(feedback)
          ? feedback.some(f => f.givenBy?._id?.toString() === userId || f.givenBy?.toString() === userId)
          : false;
        if (!hasUserFeedback) {
          setSessionId(latest._id);
        } else {
          setSessionId(null);
        }
      } catch (err) {
        setError('Unable to load feedback reminder');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (dismissed || loading || error || !sessionId) {
    return null;
  }

  return (
    <div className="feedback-reminder-banner">
      <div className="reminder-content">
        <div>
          <h3>Give feedback for your last interview</h3>
          <p>Share quick feedback to help improve the experience.</p>
        </div>
        <div className="reminder-actions">
          <button
            className="reminder-btn primary"
            onClick={() => navigate(`/feedback/${sessionId}`)}
          >
            Give Feedback
          </button>
          <button
            className="reminder-btn ghost"
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackReminderBanner;


