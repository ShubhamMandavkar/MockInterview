import { useEffect, useRef } from "react";
import "./VideoPlayer.css";

const VideoPlayer = ({ 
  videoRef, 
  muted = false, 
  showMicStatus = false, 
  showCameraStatus = false, 
  isMicOn = true, 
  isCameraOn = true,
  userName = ""
}) => {
  const streamIdRef = useRef(null);

  // Ensure video element stays bound to stream changes
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.log("VideoPlayer: No video element ref");
      return;
    }

    console.log("VideoPlayer: Setting up video element", { 
      userName, 
      hasStream: !!videoElement.srcObject,
      streamId: videoElement.srcObject?.id 
    });

    // Handle video element events for stability
    const handleLoadedMetadata = () => {
      console.log("VideoPlayer: Video metadata loaded", userName);
      // Ensure video plays when metadata is loaded
      videoElement.play().catch(error => {
        console.error("VideoPlayer: Error playing video", userName, error);
      });
    };

    const handleError = (e) => {
      console.error("VideoPlayer: Video element error", userName, e);
    };

    const handlePlay = () => {
      console.log("VideoPlayer: Video started playing", userName);
    };

    const handlePause = () => {
      console.log("VideoPlayer: Video paused", userName);
    };

    // IMPORTANT: Monitor if stream becomes inactive
    const handleStreamInactive = () => {
      console.warn("VideoPlayer: Stream became inactive", userName);
      // Try to restart playback
      if (videoElement.srcObject) {
        videoElement.play().catch(console.error);
      }
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    // Monitor stream status
    if (videoElement.srcObject) {
      videoElement.srcObject.addEventListener('inactive', handleStreamInactive);
      streamIdRef.current = videoElement.srcObject.id;
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
      }
      if (videoElement?.srcObject) {
        videoElement.srcObject.removeEventListener('inactive', handleStreamInactive);
      }
    };
  }, [videoRef, userName]);

  // REMOVED: The problematic rebinding effect that was causing issues
  // This was interrupting the remote stream connection
  
  return (
    <div className="video-player-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="video-element"
      />
      
      {/* Camera off overlay */}
      {showCameraStatus && !isCameraOn && (
        <div className="camera-off-overlay">
          <div className="camera-off-content">
            <span className="camera-off-icon">📷</span>
            <span className="camera-off-text">Camera is turned off</span>
          </div>
        </div>
      )}
      
      {/* Media status indicators */}
      <div className="media-status-indicators">
        {userName && (
          <span className="user-name-indicator">{userName}</span>
        )}
        
        {showMicStatus && (
          <span className={`mic-indicator ${isMicOn ? 'mic-on' : 'mic-off'}`}>
            {isMicOn ? '🎤' : '🔇'}
            {!isMicOn && <span className="mic-off-text">Microphone muted</span>}
          </span>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;