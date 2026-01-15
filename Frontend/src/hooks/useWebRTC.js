import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../sockets/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

const useWebRTC = ({ sessionId, isInterviewer, enabled = true }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null); // NEW: Track remote stream
  const pendingIceCandidatesRef = useRef([]);
  
  const isInitializedRef = useRef(false);
  const currentSessionIdRef = useRef(null);
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMediaReady, setIsMediaReady] = useState(false);

  console.log("🎯 useWebRTC hook render", { 
    sessionId, 
    isInterviewer, 
    enabled,
    isInitialized: isInitializedRef.current,
    currentSessionId: currentSessionIdRef.current,
    isMediaReady,
    hasLocalStream: !!localStreamRef.current
  });

  const initializeMediaStream = useCallback(async () => {
    console.log("🎥 initializeMediaStream called");

    if (localStreamRef.current && localStreamRef.current.active) {
      console.log("✅ Reusing existing active media stream");
      setIsMediaReady(true);
      return localStreamRef.current;
    }

    try {
      console.log("🚀 Requesting new media stream...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log("✅ Media stream obtained", { 
        streamId: stream.id, 
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        active: stream.active
      });

      localStreamRef.current = stream;
      setIsMediaReady(true);

      if (localVideoRef.current) {
        console.log("🎥 Binding stream to local video element");
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        
        try {
          await localVideoRef.current.play();
          console.log("✅ Local video playing");
        } catch (playError) {
          console.error("❌ Error playing local video:", playError);
        }
      }

      return stream;
    } catch (error) {
      console.error("❌ Failed to get media stream:", error);
      setIsMediaReady(false);
      throw error;
    }
  }, []);

  const createPeerConnection = useCallback((stream) => {
    console.log("🔗 Creating peer connection");

    if (pcRef.current) {
      console.log("⚠️ Closing existing peer connection");
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach(track => {
      console.log(`➕ Adding ${track.kind} track to peer connection`);
      pc.addTrack(track, stream);
    });

    // NEW: Enhanced remote track handling with stability improvements
    pc.ontrack = (event) => {
      console.log("🔥 Received remote track", {
        kind: event.track.kind,
        streamId: event.streams[0]?.id,
        trackId: event.track.id,
        trackState: event.track.readyState
      });

      const [remoteStream] = event.streams;
      
      if (remoteStream) {
        // Store remote stream reference
        remoteStreamRef.current = remoteStream;
        
        // Monitor remote track events
        event.track.onended = () => {
          console.warn("⚠️ Remote track ended", event.track.kind);
        };
        
        event.track.onmute = () => {
          console.warn("⚠️ Remote track muted", event.track.kind);
        };
        
        event.track.onunmute = () => {
          console.log("✅ Remote track unmuted", event.track.kind);
        };
        
        if (remoteVideoRef.current) {
          console.log("🎥 Setting remote stream to video element");
          
          // IMPORTANT: Only set srcObject if it's different
          if (remoteVideoRef.current.srcObject !== remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          
          // Ensure autoplay
          remoteVideoRef.current.autoplay = true;
          remoteVideoRef.current.playsInline = true;
          
          remoteVideoRef.current.play()
            .then(() => console.log("✅ Remote video playing"))
            .catch(err => {
              console.error("❌ Error playing remote video:", err);
              // Retry after a short delay
              setTimeout(() => {
                remoteVideoRef.current?.play().catch(console.error);
              }, 1000);
            });
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 New ICE candidate");
        
        if (pc.remoteDescription) {
          console.log("📤 Sending ICE candidate");
          socket.emit("webrtc-ice-candidate", {
            sessionId,
            candidate: event.candidate
          });
        } else {
          console.log("⏳ Queuing ICE candidate (no remote description yet)");
          pendingIceCandidatesRef.current.push(event.candidate);
        }
      } else {
        console.log("✅ ICE gathering complete");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("🔗 Connection state:", pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        console.error("❌ Connection failed, attempting to restart ICE");
        pc.restartIce();
      }
      
      // NEW: Handle disconnected state more gracefully
      if (pc.connectionState === 'disconnected') {
        console.warn("⚠️ Connection disconnected, will attempt recovery");
        // Don't immediately restart, wait to see if it reconnects
        setTimeout(() => {
          if (pc.connectionState === 'disconnected') {
            console.log("🔄 Connection still disconnected, restarting ICE");
            pc.restartIce();
          }
        }, 3000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("🧊 ICE State:", pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'disconnected') {
        console.log("⚠️ Peer disconnected, waiting before restart...");
        // Wait a bit before restarting to avoid unnecessary restarts
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            pc.restartIce();
          }
        }, 2000);
      }
      
      if (pc.iceConnectionState === 'failed') {
        console.error("❌ ICE connection failed completely");
        if (isInterviewer) {
          // Interviewer initiates renegotiation
          setTimeout(() => {
            if (pc.signalingState === 'stable') {
              console.log("🔄 Attempting renegotiation");
              pc.createOffer().then(offer => {
                return pc.setLocalDescription(offer);
              }).then(() => {
                socket.emit("webrtc-offer", { sessionId, offer: pc.localDescription });
              }).catch(console.error);
            }
          }, 1000);
        }
      }
      
      // NEW: Log when connection is established
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log("✅ ICE connection established successfully");
      }
    };

    pc.onsignalingstatechange = () => {
      console.log("📡 Signaling state:", pc.signalingState);
    };

    pc.onnegotiationneeded = async () => {
      try {
        console.log("🔄 Negotiation needed - creating offer");
        if (isInterviewer && pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc-offer", { sessionId, offer });
        }
      } catch (err) {
        console.error("❌ Negotiation failed:", err);
      }
    };

    return pc;
  }, [sessionId, isInterviewer]);

  const handleOffer = useCallback(async (offer) => {
    try {
      console.log("📨 Handling offer");
      const pc = pcRef.current;
      
      if (!pc) {
        console.error("❌ No peer connection available");
        return;
      }

      // NEW: Check signaling state before setting remote description
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        console.warn("⚠️ Invalid signaling state for offer:", pc.signalingState);
        // Wait for stable state
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("✅ Remote description set (offer)");

      // Process pending ICE candidates with validation
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log(`🔥 Adding ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("⚠️ Failed to add pending ICE candidate:", err);
          }
        }
        pendingIceCandidatesRef.current = [];
      }

      const answer = await pc.createAnswer();
      console.log("✅ Created answer");

      await pc.setLocalDescription(answer);
      console.log("✅ Local description set (answer)");

      socket.emit("webrtc-answer", { sessionId, answer });
      console.log("📤 Sent answer");
    } catch (error) {
      console.error("❌ Error handling offer:", error);
    }
  }, [sessionId]);

  const handleAnswer = useCallback(async (answer) => {
    try {
      console.log("📨 Handling answer");
      const pc = pcRef.current;
      
      if (!pc) {
        console.error("❌ No peer connection available");
        return;
      }

      // NEW: Validate signaling state
      if (pc.signalingState !== 'have-local-offer') {
        console.warn("⚠️ Unexpected signaling state for answer:", pc.signalingState);
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("✅ Remote description set (answer)");

      // Process pending ICE candidates with validation
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log(`🔥 Adding ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("⚠️ Failed to add pending ICE candidate:", err);
          }
        }
        pendingIceCandidatesRef.current = [];
      }
    } catch (error) {
      console.error("❌ Error handling answer:", error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      console.log("📨 Handling ICE candidate");
      const pc = pcRef.current;
      
      if (!pc) {
        console.error("❌ No peer connection available");
        return;
      }

      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ ICE candidate added");
        } catch (err) {
          console.warn("⚠️ Failed to add ICE candidate:", err);
        }
      } else {
        console.log("⏳ Queuing ICE candidate (no remote description yet)");
        pendingIceCandidatesRef.current.push(candidate);
      }
    } catch (error) {
      console.error("❌ Error adding ICE candidate:", error);
    }
  }, []);

  const handleBothParticipantsReady = useCallback(async () => {
    console.log("🎯 Both participants ready");
    
    if (isInterviewer) {
      console.log("👨‍💼 Interviewer creating offer");
      const pc = pcRef.current;
      
      if (!pc) {
        console.error("❌ No peer connection available");
        return;
      }

      try {
        const offer = await pc.createOffer();
        console.log("✅ Created offer");

        await pc.setLocalDescription(offer);
        console.log("✅ Local description set (offer)");

        socket.emit("webrtc-offer", { sessionId, offer });
        console.log("📤 Sent offer");
      } catch (error) {
        console.error("❌ Error creating offer:", error);
      }
    } else {
      console.log("👨‍💻 Interviewee waiting for offer");
    }
  }, [isInterviewer, sessionId]);

  const toggleMicrophone = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(prev => !prev);
      console.log("🎤 Microphone toggled:", !isMicOn);
    }
  }, [isMicOn]);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn(prev => !prev);
      console.log("📷 Camera toggled:", !isCameraOn);
    }
  }, [isCameraOn]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      console.log("❌ WebRTC not enabled or no sessionId");
      return;
    }

    if (isInitializedRef.current && currentSessionIdRef.current === sessionId) {
      console.log("⚠️ WebRTC already initialized for this session");
      return;
    }

    console.log("🚀 Initializing WebRTC for session:", sessionId);
    isInitializedRef.current = true;
    currentSessionIdRef.current = sessionId;

    const initWebRTC = async () => {
      try {
        const stream = await initializeMediaStream();
        if (!stream) {
          throw new Error("Failed to get media stream");
        }

        createPeerConnection(stream);

        socket.on("webrtc-offer", handleOffer);
        socket.on("webrtc-answer", handleAnswer);
        socket.on("webrtc-ice-candidate", handleIceCandidate);
        socket.on("both-participants-ready", handleBothParticipantsReady);

        console.log("✅ WebRTC initialization complete");
      } catch (error) {
        console.error("❌ WebRTC initialization failed:", error);
        isInitializedRef.current = false;
        currentSessionIdRef.current = null;
        setIsMediaReady(false);
      }
    };

    initWebRTC();

    return () => {
      console.log("🧹 Cleaning up WebRTC");

      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);
      socket.off("both-participants-ready", handleBothParticipantsReady);

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track`);
        });
        localStreamRef.current = null;
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      remoteStreamRef.current = null;
      isInitializedRef.current = false;
      currentSessionIdRef.current = null;
      pendingIceCandidatesRef.current = [];
      setIsMediaReady(false);
    };
  }, [sessionId, enabled, isInterviewer, initializeMediaStream, createPeerConnection, handleOffer, handleAnswer, handleIceCandidate, handleBothParticipantsReady]);

  // NEW: Monitor remote video element and ensure stream stays bound
  useEffect(() => {
    if (!remoteVideoRef.current || !remoteStreamRef.current) return;

    const videoElement = remoteVideoRef.current;
    const remoteStream = remoteStreamRef.current;

    // Periodically check if video element still has the stream
    const checkInterval = setInterval(() => {
      if (videoElement.srcObject !== remoteStream) {
        console.warn("⚠️ Remote video lost stream, rebinding...");
        videoElement.srcObject = remoteStream;
        videoElement.play().catch(console.error);
      }
      
      // Check if video is paused and should be playing
      if (videoElement.paused && remoteStream.active) {
        console.warn("⚠️ Remote video paused unexpectedly, restarting...");
        videoElement.play().catch(console.error);
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [remoteVideoRef.current, remoteStreamRef.current]);

  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current && !localVideoRef.current.srcObject) {
      console.log("🔄 Rebinding local video element");
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localVideoRef.current, localStreamRef.current]);

  return {
    localVideoRef,
    remoteVideoRef,
    toggleMicrophone,
    toggleCamera,
    isMicOn,
    isCameraOn,
    isMediaReady
  };
};

export default useWebRTC;