import { useState } from "react";
import { dashboardService } from "../services/dashboardService";
import "./InterviewControls.css";

const InterviewControls = ({ 
  sessionId, 
  isInterviewer, 
  onSessionEnd,
  // Media control props
  toggleMicrophone,
  toggleCamera,
  isMicOn,
  isCameraOn,
  isMediaReady,
  webrtcEnabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startSession = async () => {
    try {
      setLoading(true);
      setError(null);
      await dashboardService.startSession(sessionId);
      // Session will be refreshed by parent component
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    const confirmed = window.confirm('Are you sure you want to end this session? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setLoading(true);
      setError(null);
      await dashboardService.endSession(sessionId);
      // Notify parent component about session end
      if (onSessionEnd) {
        onSessionEnd();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  const extendSession = async (extraMinutes = 15) => {
    try {
      setLoading(true);
      setError(null);
      await dashboardService.extendSession(sessionId, extraMinutes);
      // Session will be refreshed by parent component
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to extend session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="interview-controls">
      {error && (
        <div className="control-error">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-error-btn">
            Dismiss
          </button>
        </div>
      )}
      
      {/* Media Controls - Available for all users when media is ready */}
      {toggleMicrophone && toggleCamera ? (
        webrtcEnabled ? (
          isMediaReady ? (
            <div className="media-controls">
              <button
                onClick={toggleMicrophone}
                className={`media-btn ${isMicOn ? 'media-btn-on' : 'media-btn-off'}`}
                title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                <span className="media-icon">
                  {isMicOn ? '🎤' : '🔇'}
                </span>
                <span className="media-label">
                  {isMicOn ? 'Mic ON' : 'Mic OFF'}
                </span>
              </button>
            
              <button
                onClick={toggleCamera}
                className={`media-btn ${isCameraOn ? 'media-btn-on' : 'media-btn-off'}`}
                title={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
              >
                <span className="media-icon">
                  {isCameraOn ? '📹' : '📷'}
                </span>
                <span className="media-label">
                  {isCameraOn ? 'Camera ON' : 'Camera OFF'}
                </span>
              </button>
            </div>
          ) : (
            <div className="media-controls-loading">
              <span className="loading-text">Initializing media...</span>
            </div>
          )
        ) : (
          <div className="media-controls-disabled">
            <span className="disabled-text">Media controls will be available when you join the session</span>
          </div>
        )
      ) : null}
      
      {/* Session Controls - Only for interviewers */}
      <div className="control-buttons">
        {isInterviewer && (
          <>
            <button 
              onClick={() => extendSession(15)}
              disabled={loading}
              className="extend-btn"
            >
              {loading ? 'Extending...' : 'Extend +15 min'}
            </button>
            <button 
              onClick={endSession}
              disabled={loading}
              className="end-btn"
            >
              {loading ? 'Ending...' : 'End Session'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InterviewControls;
