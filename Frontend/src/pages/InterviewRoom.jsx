import { useParams} from "react-router-dom";
import { useEffect, useState } from "react";
import useWebRTC from "../hooks/useWebRTC";
import useParticipantPresence from "../hooks/useParticipantPresence";
import VideoPlayer from "../components/VideoPlayer";
import InterviewControls from "../components/InterviewControls";
import QuestionPanel from "../components/QuestionPanel";
import api from "../services/api";
import './InterviewRoom.css';

const InterviewRoom = () => {
  const { sessionId } = useParams();

  // Replace with real logic from auth/user state
  const user = JSON.parse(localStorage.getItem("user"));
  const isInterviewer = user?.roles?.includes("INTERVIEWER");

  // Session data state
  const [sessionData, setSessionData] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Participant presence tracking
  const { 
    participantCount, 
    isUserJoined, 
    joinSession 
  } = useParticipantPresence({
    sessionId,
    enabled: true
  });

  // WebRTC with persistent media streams
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
    enabled: isUserJoined
  });

  // Fetch session data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await api.get(`/interview-sessions/${sessionId}`);
        setSessionData(response.data);
      } catch (error) {
        console.error('Error fetching session data:', error);
      } finally {
        setLoadingSession(false);
      }
    };

    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Auto-join session on component mount
  useEffect(() => {
    if (sessionId && !isUserJoined) {
      joinSession();
    }
  }, [sessionId, isUserJoined, joinSession]);

  const isSessionLive = sessionData?.status === 'LIVE';

  if (loadingSession) {
    return (
      <div className="loading-container">
        <p>Loading session...</p>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="error-container">
        <p>Session not found</p>
      </div>
    );
  }

  return (
    <div className="interview-room">
      {/* Main Interview Area */}
      <div className="interview-main">
        <div className="interview-header">
          <h2>Interview Room</h2>
          <p>Participants: {participantCount} | Status: {sessionData.status}</p>
        </div>

        <div className="video-container">
          <VideoPlayer 
            videoRef={localVideoRef} 
            muted 
            showMicStatus={true}
            showCameraStatus={true}
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            userName="You"
          />
          <VideoPlayer 
            videoRef={remoteVideoRef}
            showMicStatus={true}
            showCameraStatus={false}
            isMicOn={true}
            isCameraOn={true}
            userName="Remote"
          />
        </div>

        <InterviewControls
          sessionId={sessionId}
          isInterviewer={isInterviewer}
          toggleMicrophone={toggleMicrophone}
          toggleCamera={toggleCamera}
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          isMediaReady={isMediaReady}
          webrtcEnabled={isUserJoined}
        />
      </div>

      {/* Question Panel */}
      <div className="question-panel-container">
        <QuestionPanel
          sessionId={sessionId}
          sessionData={sessionData}
          isInterviewer={isInterviewer}
          isSessionLive={isSessionLive}
        />
      </div>
    </div>
  );
};

export default InterviewRoom;
