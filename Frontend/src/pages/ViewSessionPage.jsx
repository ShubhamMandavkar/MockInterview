import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import socket from '../sockets/socket';
import useWebRTC from '../hooks/useWebRTC';
import useParticipantPresence from '../hooks/useParticipantPresence';
import VideoPlayer from '../components/VideoPlayer';
import InterviewControls from '../components/InterviewControls';
import QuestionPanel from '../components/QuestionPanel';
import './ViewSessionPage.css';

const ViewSessionPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null); // Separate state for status
  const [currentTime, setCurrentTime] = useState(new Date()); // Local time state for button enabling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionTime, setSessionTime] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [hasFeedback, setHasFeedback] = useState(false);

  const isInterviewer = user?.roles?.includes('INTERVIEWER');
  const isInterviewee = user?.roles?.includes('INTERVIEWEE');

  // Memoize user object to prevent unnecessary re-renders
  // const stableUser = useMemo(() => user, [user?._id, user?.name, user?.email]);

  // Ensure we have a stable user object reference
  const stableUser = useMemo(() => {
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles
    };
  }, [user?._id, user?.name, user?.email, JSON.stringify(user?.roles)]);

  const updateSessionTime = useCallback((sessionData) => {
    if (!sessionData?.startedAt) return;

    const startTime = new Date(sessionData.startedAt);
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000); // seconds

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    setSessionTime({
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    });
  }, []);

  

  // Participant presence tracking via socket (replaces local userJoined state)
  // const {
  //   participants,
  //   participantCount,
  //   isUserJoined,
  //   joinSession,
  //   leaveSession
  // } = useParticipantPresence({
  //   sessionId,
  //   enabled: !!sessionId, // Enable as soon as we have a sessionId
  //   currentUser: stableUser // Pass the stable user object
  // });

  const { 
    participantCount, 
    isUserJoined, 
    joinSession, 
    leaveSession 
  } = useParticipantPresence({
    sessionId,
    enabled: !!sessionId && !!stableUser, // Only enable when we have both sessionId and user
    currentUser: stableUser // Pass the stable user object
  });

  // Simple local state for join status as fallback
  const [localJoinedState, setLocalJoinedState] = useState(false);

  // Remote participant media state tracking
  const [remoteMediaState, setRemoteMediaState] = useState({
    micOn: true,
    cameraOn: true
  });

  // Use either socket-based or local state
  const userHasJoined = isUserJoined || localJoinedState;

  // Simple join function that works regardless of socket state
  const handleJoinSession = async () => {
    console.log('handleJoinSession called', { 
      isInterviewer, 

      sessionStatus: sessionStatus, 
      sessionId,
      userId: user?._id 
    });

    // Set local state immediately for UI responsiveness
    setLocalJoinedState(true);

    // CRITICAL: Mark interviewee as joined for no-show logic
    // This must be called BEFORE WebRTC initialization to set firstIntervieweeJoinedAt
    if (isInterviewee && sessionStatus === 'LIVE') {
      try {
        console.log('Attempting to mark interviewee as joined for session:', sessionId);
        console.log('Session details:', {
          sessionId: session._id,
          status: sessionStatus,
          intervieweeId: session.intervieweeId?._id || session.intervieweeId,
          currentUserId: user._id
        });
        
        const result = await dashboardService.markIntervieweeJoined(sessionId);
        console.log('Successfully marked interviewee as joined:', result);
        
        // Clear any previous errors
        setActionError(null);
        
      } catch (error) {
        console.error('Failed to mark interviewee as joined:', error);
        console.error('Error details:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          data: error.response?.data
        });
        
      }
    }

    // Ensure socket connection
    socket.auth = {
      token: localStorage.getItem("token")
    };

    // Force socket connection if not connected
    if (!socket.connected) {
      socket.connect();
    }

    // Wait a moment for connection, then emit join event
    setTimeout(() => {
      socket.emit("join-session", sessionId);
    }, 100);

    // Try socket-based join function as backup
    if (joinSession) {
      joinSession();
    }

    setActionError(null);
  };

  // WebRTC integration - only initialize when user has joined and session is LIVE
  const { 
    localVideoRef, 
    remoteVideoRef, 
    toggleMicrophone, 
    toggleCamera, 
    isMicOn, 
    isCameraOn, 
    isMediaReady 
  } = useWebRTC({
    sessionId,
    isInterviewer,
    enabled: isUserJoined && sessionStatus === 'LIVE' && !!stableUser
  });

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getSessionById(sessionId);

      // Backend already validates access, but double-check on frontend for security
      const userId = stableUser._id.toString();
      const intervieweeId = data.intervieweeId?._id?.toString() || data.intervieweeId?.toString();
      const interviewerId = data.interviewerId?._id?.toString() || data.interviewerId?.toString();

      if (userId !== intervieweeId && userId !== interviewerId) {
        setError('You do not have access to this session');
        return;
      }

      setSession(data);
      setSessionStatus(data.status); // Initialize separate status state
      
      // Log session details for debugging
      console.log('Session fetched:', {
        id: data._id,
        status: data.status,
        firstIntervieweeJoinedAt: data.firstIntervieweeJoinedAt,
        startedAt: data.startedAt,
        endedAt: data.endedAt
      });
      
      if (data.status === 'LIVE' && data.startedAt) {
        updateSessionTime(data);
      }
      // If completed, check feedback status
      if (data.status === 'COMPLETED') {
        await fetchFeedbackStatus();
      } else {
        setHasFeedback(false);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      if (err.response?.status === 403) {
        setError('You do not have access to this session');
      } else if (err.response?.status === 404) {
        setError('Session not found');
      } else {
        setError('Failed to load session details');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, stableUser, updateSessionTime]);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  // Check authentication and redirect if not logged in
  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Reset participant state when session status changes
  useEffect(() => {
    if (sessionStatus !== 'LIVE') {
      // Leave session when it's no longer LIVE
      setLocalJoinedState(false);
      if (leaveSession) leaveSession();
    }
  }, [sessionStatus, leaveSession]);

  // Handle session end cleanup
  useEffect(() => {
    if (sessionStatus === 'COMPLETED') {
      // Ensure participant leaves when session ends
      setLocalJoinedState(false);
      if (leaveSession) leaveSession();
    }
  }, [sessionStatus, leaveSession]);

  // Handle socket connection for session updates
  useEffect(() => {
    if (sessionId && user) {
      socket.auth = {
        token: localStorage.getItem("token")
      };

      if (!socket.connected) {
        socket.connect();
      }

      // Don't auto-join session room - we'll receive targeted events instead
      console.log('🔌 Socket connected for session lifecycle events:', sessionId);

      // Listen for socket connection events
      const handleConnect = () => {
        // Socket connected successfully
      };

      const handleDisconnect = (reason) => {
        // Socket disconnected
      };

      const handleConnectError = (error) => {
        // Socket connection error
      };

      const handleError = (error) => {
        // Socket error
      };

      // Listen for remote participant media state changes
      const handleParticipantMediaState = ({ micOn, cameraOn }) => {
        setRemoteMediaState({ micOn, cameraOn });
      };

      // Listen for session lifecycle events
      const handleSessionStarted = ({ sessionId: eventSessionId, status, startedAt }) => {
        console.log('📥 Session started event received:', { eventSessionId, status, startedAt });
        if (eventSessionId === sessionId) {
          console.log('✅ Updating session status to LIVE');
          setSessionStatus(status);
          // Update session object with new startedAt time
          setSession(prev => prev ? { ...prev, status, startedAt } : prev);
        } else {
          console.log('⚠️ Session started event for different session, ignoring');
        }
      };

      const handleSessionEnded = ({ sessionId: eventSessionId, status, endedAt }) => {
        console.log('📥 Session ended event received:', { eventSessionId, status, endedAt });
        if (eventSessionId === sessionId) {
          console.log('✅ Updating session status to', status);
          setSessionStatus(status);
          // Update session object with new endedAt time
          setSession(prev => prev ? { ...prev, status, endedAt } : prev);
          
          // Trigger WebRTC cleanup
          setLocalJoinedState(false);
          if (leaveSession) leaveSession();
        } else {
          console.log('⚠️ Session ended event for different session, ignoring');
        }
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);
      socket.on('error', handleError);
      socket.on('participant-media-state', handleParticipantMediaState);
      socket.on('session-started', handleSessionStarted);
      socket.on('session-ended', handleSessionEnded);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
        socket.off('error', handleError);
        socket.off('participant-media-state', handleParticipantMediaState);
        socket.off('session-started', handleSessionStarted);
        socket.off('session-ended', handleSessionEnded);
      };
    }
  }, [sessionId]);

  // Poll for session updates when LIVE to keep timer and status in sync - REMOVED
  // Now using socket events instead of polling

  // Poll for session updates when SCHEDULED to detect when it goes LIVE - REMOVED  
  // Now using socket events instead of polling

  useEffect(() => {
    if (sessionStatus === 'LIVE' && session?.startedAt) {
      // Initial timer update
      updateSessionTime(session);

      // Update timer every second for live sessions
      const interval = setInterval(() => {
        updateSessionTime(session);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [sessionStatus, session?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lightweight timer for start button enablement (time-based UI updates)
  useEffect(() => {
    // Initial update
    setCurrentTime(new Date());
    
    // Update current time every 30 seconds to check if start button should be enabled
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Emit media state changes to other participants
  useEffect(() => {
    if (userHasJoined && sessionId && socket.connected) {
      socket.emit('participant-media-state', {
        sessionId,
        micOn: isMicOn,
        cameraOn: isCameraOn
      });
    }
  }, [isMicOn, isCameraOn, userHasJoined, sessionId]);

  const fetchFeedbackStatus = async () => {
    try {
      const feedback = await dashboardService.getSessionFeedback(sessionId);
      // Consider submitted only if current user has submitted feedback
      const userId = stableUser?._id?.toString();
      const hasUserFeedback = Array.isArray(feedback)
        ? feedback.some(f => f.givenBy?._id?.toString() === userId || f.givenBy?.toString() === userId)
        : false;
      setHasFeedback(hasUserFeedback);
    } catch (err) {
      // If not found or error, assume no feedback yet
      setHasFeedback(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusMessage = () => {
    if (!session) return '';

    // CRITICAL: Session completion status MUST always be derived from backend sessionStatus
    // This overrides any presence-based logic to prevent "no_show_interviewer" after valid completion
    switch (sessionStatus) {
      case 'SCHEDULED':
        return isSessionInterviewer
          ? 'Ready to start the session'
          : 'Waiting for interviewer to start the session';
      case 'LIVE':
        // For LIVE sessions, show presence-based status only if session is still active
        if (bothParticipantsPresent) {
          return 'Both participants are connected';
        } else if (waitingForInterviewer) {
          return 'Waiting for interviewer to join';
        } else if (waitingForInterviewee) {
          return 'Waiting for interviewee to join';
        } else {
          return isSessionInterviewer
            ? 'Session is live - interviewee can join'
            : 'Session is live - you can join now';
        }
      case 'COMPLETED':
        // COMPLETED status always overrides presence state - no "no_show" messages
        return 'Session completed';
      case 'CANCELLED':
        return 'Session cancelled';
      default:
        return 'Unknown status';
    }
  };

  const handleStartSession = async () => {
    if (actionLoading) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await dashboardService.startSession(sessionId);

      // Refresh session data to get updated status
      await fetchSession();
    } catch (err) {
      console.error('Error starting session:', err);
      setActionError(err.response?.data?.message || 'Failed to start session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (actionLoading) return;

    const confirmed = window.confirm('Are you sure you want to end this session? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await dashboardService.endSession(sessionId);

      // Refresh session data to get updated status
      await fetchSession();
    } catch (err) {
      console.error('Error ending session:', err);
      setActionError(err.response?.data?.message || 'Failed to end session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendSession = async (extraMinutes = 15) => {
    if (actionLoading) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await dashboardService.extendSession(sessionId, extraMinutes);

      // Refresh session data to get updated duration
      await fetchSession();
    } catch (err) {
      console.error('Error extending session:', err);
      setActionError(err.response?.data?.message || 'Failed to extend session');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = () => {
    if (!session) return '';

    switch (sessionStatus) {
      case 'SCHEDULED':
        return 'status-scheduled';
      case 'LIVE':
        return 'status-live';
      case 'COMPLETED':
        return 'status-completed';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  };

  if (loading) {
    return (
      <div className="view-session-page">
        <div className="session-container">
          <div className="loading-state">Loading session details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-session-page">
        <div className="session-container">
          <div className="error-state">
            <h2>Error</h2>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={() => navigate('/dashboard')} className="back-btn">
                Back to Dashboard
              </button>
              <button onClick={fetchSession} className="retry-btn">
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="view-session-page">
        <div className="session-container">
          <div className="error-state">
            <h2>Session Not Found</h2>
            <p>The session you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/dashboard')} className="back-btn">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get scheduled time from requestId or fallback to createdAt
  const scheduledTime = session.requestId?.scheduledAt || session.createdAt;
  const interviewerName = session.interviewerId?.name || 'Interviewer';
  const intervieweeName = session.intervieweeId?.name || 'Interviewee';
  const isLive = sessionStatus === 'LIVE';
  const isCompleted = sessionStatus === 'COMPLETED';
  const isScheduled = sessionStatus === 'SCHEDULED';

  // Check if current user is the interviewer for this session
  const userId = user?._id?.toString();
  const sessionInterviewerId = session.interviewerId?._id?.toString() || session.interviewerId?.toString();
  const isSessionInterviewer = userId === sessionInterviewerId;
  
  // Calculate proper presence state
  const bothParticipantsPresent = participantCount >= 2;
  const waitingForInterviewer = !isSessionInterviewer && participantCount < 2;
  const waitingForInterviewee = isSessionInterviewer && participantCount < 2;
  
  const scheduledDate = scheduledTime ? new Date(scheduledTime) : null;
  const canStartSession = isSessionInterviewer && isScheduled && scheduledDate && scheduledDate <= currentTime;

  return (
    <div className="view-session-page">
      <div className="session-container">
        {/* Header */}
        <div className="session-header">
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back to Dashboard
          </button>
          <h1 className="session-title">Interview Session</h1>
          <button
            onClick={fetchSession}
            className="refresh-button"
            disabled={loading}
            title="Refresh session data"
          >
            {loading ? '⟳' : '↻'} Refresh
          </button>
        </div>

        {/* Status Section */}
        <div className="session-status-section">
          <div className="status-badge-container">
            <span className={`status-badge ${getStatusBadgeClass()}`}>
              {sessionStatus}
            </span>
            {isLive && (
              <span className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </span>
            )}
          </div>
          <p className="status-message">{getStatusMessage()}</p>
        </div>

        {/* Session Details */}
        <div className="session-details-card">
          <h2 className="card-title">Session Details</h2>
          <div className="details-grid">
            {isSessionInterviewer ? (
              <div className="detail-row">
                <span className="detail-label">Interviewee:</span>
                <span className="detail-value">{intervieweeName}</span>
              </div>
            ) : (
              <div className="detail-row">
                <span className="detail-label">Interviewer:</span>
                <span className="detail-value">{interviewerName}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Scheduled Time:</span>
              <span className="detail-value">{formatDateTime(scheduledTime)}</span>
            </div>
            {session.duration && (
              <div className="detail-row">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">
                  {session.duration} minutes
                  {session.extendedBy > 0 && (
                    <span className="extended-badge"> (+{session.extendedBy} min extended)</span>
                  )}
                </span>
              </div>
            )}
            {isLive && session.startedAt && (
              <div className="detail-row">
                <span className="detail-label">Started At:</span>
                <span className="detail-value">{formatDateTime(session.startedAt)}</span>
              </div>
            )}
            {isLive && session.firstIntervieweeJoinedAt && (
              <div className="detail-row">
                <span className="detail-label">Interviewee Joined At:</span>
                <span className="detail-value">{formatDateTime(session.firstIntervieweeJoinedAt)}</span>
              </div>
            )}
            {isCompleted && session.endedAt && (
              <div className="detail-row">
                <span className="detail-label">Ended At:</span>
                <span className="detail-value">{formatDateTime(session.endedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Interview Details */}
        <div className="interview-details-card">
          <h2 className="card-title">Interview Details</h2>
          <div className="details-grid">
            <div className="detail-row">
              <span className="detail-label">Interview Type:</span>
              <span className="detail-value">
                {session.requestId?.interviewTypes?.join(', ') || 'Not specified'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Difficulty Level:</span>
              <span className="detail-value">
                {session.requestId?.difficulty || 'Not specified'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Planned Duration:</span>
              <span className="detail-value">
                {session.requestId?.duration || session.duration} minutes
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Scheduled Date & Time:</span>
              <span className="detail-value">{formatDateTime(scheduledTime)}</span>
            </div>
          </div>
        </div>

        {/* Interviewee Information */}
        <div className="interviewee-info-card">
          <h2 className="card-title">Interviewee Information</h2>
          <div className="interviewee-details">
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{intervieweeName}</span>
            </div>
            <div className="skills-section">
              <span className="detail-label">Skills:</span>
              <div className="skills-container">
                {session.requestId?.skills && session.requestId.skills.length > 0 ? (
                  <div className="skills-chips">
                    {session.requestId.skills.map((skill, index) => (
                      <span key={index} className="skill-chip">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="no-skills-message">No skills information available</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Session Timer (for LIVE sessions) */}
        {isLive && sessionTime && (
          <div className="session-timer-card">
            <h2 className="card-title">Session Timer</h2>
            <div className="timer-display">
              <span className="timer-value">{sessionTime.hours}</span>
              <span className="timer-separator">:</span>
              <span className="timer-value">{sessionTime.minutes}</span>
              <span className="timer-separator">:</span>
              <span className="timer-value">{sessionTime.seconds}</span>
            </div>
            <p className="timer-label">Elapsed Time</p>
          </div>
        )}

        {/* Session Interface */}
        <div className="session-interface-container">
          <h2 className="card-title">Session Interface</h2>
          <div className="session-interface">
            {isLive ? (
              userHasJoined ? (
                // WebRTC Interface - Replace placeholder UI with InterviewRoom
                <div className="webrtc-interface">
                  <div className="interview-main-content">
                    <div className="video-container">
                      <div className="video-grid">
                        <div className="video-item local-video">
                          <VideoPlayer
                            videoRef={localVideoRef}
                            muted
                            showMicStatus={true}
                            showCameraStatus={true}
                            isMicOn={isMicOn}
                            isCameraOn={isCameraOn}
                            userName={isSessionInterviewer ? 'You (Interviewer)' : 'You (Interviewee)'}
                          />
                        </div>
                        <div className="video-item remote-video">
                          <VideoPlayer
                            videoRef={remoteVideoRef}
                            showMicStatus={true}
                            showCameraStatus={true}
                            isMicOn={remoteMediaState.micOn}
                            isCameraOn={remoteMediaState.cameraOn}
                            userName={isSessionInterviewer ? intervieweeName : interviewerName}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="webrtc-controls">
                      <div className="session-status-indicator">
                        <span className="live-dot"></span>
                        <span>Session Active</span>
                      </div>

                      <InterviewControls
                        sessionId={sessionId}
                        isInterviewer={isSessionInterviewer}
                        onSessionEnd={() => {
                          // Refresh session data when session ends
                          fetchSession();
                          setLocalJoinedState(false);
                          if (leaveSession) leaveSession();
                        }}
                        // Media control props
                        toggleMicrophone={toggleMicrophone}
                        toggleCamera={toggleCamera}
                        isMicOn={isMicOn}
                        isCameraOn={isCameraOn}
                        isMediaReady={isMediaReady}
                        webrtcEnabled={userHasJoined && sessionStatus === 'LIVE'}
                      />

                      {!isSessionInterviewer && (
                        <button
                          className="leave-session-btn"
                          onClick={() => {
                            setLocalJoinedState(false);
                            if (leaveSession) leaveSession();
                          }}
                        >
                          Leave Session
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Panel - Integrated into WebRTC Interface */}
                  <div className="question-panel-sidebar">
                    <QuestionPanel
                      sessionId={sessionId}
                      sessionData={session}
                      sessionStatus={sessionStatus}
                      isInterviewer={isSessionInterviewer}
                      isSessionLive={isLive}
                    />
                  </div>
                </div>
              ) : (
                <div className="session-waiting">
                  <div className="waiting-content">
                    <div className="waiting-icon">⏳</div>
                    <h3>Ready to Join Session</h3>
                    <p>Click "Join Session" below to enter the live interview session with audio/video</p>
                    {waitingForInterviewer && (
                      <div className="waiting-status">
                        <p><strong>Status:</strong> Waiting for interviewer to join</p>
                      </div>
                    )}
                    <div className="session-preview">
                      <div className="preview-participants">
                        <div className="preview-participant">
                          <span className="preview-avatar">👨‍💼</span>
                          <span>{interviewerName} (Interviewer)</span>
                        </div>
                        <div className="preview-participant">
                          <span className="preview-avatar">👨‍💻</span>
                          <span>{intervieweeName} (Interviewee)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : isCompleted ? (
              <div className="session-completed">
                <div className="completed-content">
                  <div className="completed-icon">✅</div>
                  <h3>Session Completed</h3>
                  <p>The interview session has ended successfully</p>
                </div>
                
                {/* Question Panel for Completed Sessions */}
                <div className="completed-questions-section">
                  <QuestionPanel
                    sessionId={sessionId}
                    sessionData={session}
                    sessionStatus={sessionStatus}
                    isInterviewer={isSessionInterviewer}
                    isSessionLive={false}
                  />
                </div>
              </div>
            ) : (
              <div className="session-scheduled">
                <div className="scheduled-icon">📅</div>
                <h3>Session Scheduled</h3>
                <p>Waiting for the interviewer to start the session</p>
                <div className="scheduled-info">
                  <p><strong>Scheduled Time:</strong> {formatDateTime(scheduledTime)}</p>
                  <p><strong>Participants:</strong> {interviewerName} & {intervieweeName}</p>
                </div>
              </div>
            )}
          </div>
        </div>



        {/* Actions Section */}
        <div className="session-actions">
          {actionError && (
            <div className="action-error">
              <p>{actionError}</p>
              <button onClick={() => setActionError(null)} className="dismiss-error-btn">
                Dismiss
              </button>
            </div>
          )}

          {/* Completed session: view feedback (both roles) */}
          {isCompleted && (
            <div className="control-actions">
              <button
                className="start-session-btn"
                onClick={() => navigate(`/feedback/view/${sessionId}`)}
              >
                View Feedback
              </button>
            </div>
          )}

          {/* Interviewer Controls */}
          {isSessionInterviewer && (
            <>
              {isScheduled && (
                <div className="control-actions">
                  <button
                    className="start-session-btn"
                    onClick={async () => {
                      await handleStartSession();
                      // Auto-join the session for interviewer after starting
                      setTimeout(() => {
                        handleJoinSession();
                      }, 1000);
                    }}
                    disabled={actionLoading || !canStartSession}
                  >
                    {actionLoading ? 'Starting...' : 'Start Session'}
                  </button>
                  <p className="action-hint">
                    {canStartSession
                      ? 'Click to begin the interview session'
                      : 'Session can be started at scheduled time'}
                  </p>
                </div>
              )}

              {isLive && (
                <div className="control-actions">
                  {!userHasJoined ? (
                    <div className="interviewer-join-section">
                      <button
                        className="join-session-btn live"
                        onClick={handleJoinSession}
                      >
                        Join Session
                      </button>
                      <p className="action-hint">Click to join the session with audio/video</p>
                    </div>
                  ) : (
                    <div className="live-controls">
                      <div className="live-indicator-control">
                        <span className="live-dot"></span>
                        <span>Session is LIVE - You are connected</span>
                      </div>
                      <div className="session-participants-status">
                        <div className="participant-status">
                          <span className="participant-name">{interviewerName} (You)</span>
                          <span className="status-badge connected">Connected</span>
                        </div>
                        <div className="participant-status">
                          <span className="participant-name">{intervieweeName}</span>
                          <span className={`status-badge ${bothParticipantsPresent ? 'connected' : 'waiting'}`}>
                            {bothParticipantsPresent ? 'Connected' : 'Waiting...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="action-hint">
                    Session is active
                  </p>
                </div>
              )}

              {isCompleted && !hasFeedback && (
                <div className="feedback-cta">
                  <p>Session completed. Provide feedback to help improve the platform.</p>
                  <button
                    className="feedback-btn"
                    onClick={() => navigate(`/feedback/${sessionId}`)}
                  >
                    Submit Feedback
                  </button>
                </div>
              )}
            </>
          )}

          {/* Interviewee View */}
          {!isSessionInterviewer && (
            <>
              {isScheduled && (
                <div className="waiting-indicator">
                  <span className="waiting-icon">⏳</span>
                  <span>Waiting for interviewer to start the session</span>
                </div>
              )}

              {/* Simple join button for interviewees when session is LIVE */}
              {isLive && !userHasJoined && (
                <div className="control-actions">
                  <button
                    className="join-session-btn live"
                    onClick={handleJoinSession}
                  >
                    Join Session
                  </button>
                  <p className="action-hint">Click to join the live interview session</p>
                </div>
              )}

              {isLive && userHasJoined && (
                <div className="joined-indicator">
                  <span className="joined-icon">✅</span>
                  <span>You have joined the session</span>
                  <p className="joined-hint">
                    Connected to session
                  </p>
                </div>
              )}
              {isCompleted && !hasFeedback && (
                <div className="feedback-cta">
                  <p>Session completed. Provide feedback to help improve the platform.</p>
                  <button
                    className="feedback-btn"
                    onClick={() => navigate(`/feedback/${sessionId}`)}
                  >
                    Submit Feedback
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewSessionPage;

