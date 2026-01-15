import { useEffect, useState, useCallback } from "react";
import socket from "../sockets/socket";

const useParticipantPresence = ({ sessionId, enabled = true, currentUser }) => {
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [isUserJoined, setIsUserJoined] = useState(false);

  console.log("useParticipantPresence:", { 
    sessionId, 
    enabled, 
    isUserJoined, 
    participantCount, 
    currentUserId: currentUser?._id 
  });

  // Helper function to normalize user IDs for comparison
  const normalizeUserId = useCallback((id) => {
    if (!id) return null;
    return id.toString();
  }, []);

  const joinSession = useCallback(() => {
    console.log("🚀 joinSession called", { sessionId, socketConnected: socket.connected });
    
    if (!sessionId) {
      console.log("❌ No sessionId provided");
      return;
    }

    // Ensure socket has auth token
    const token = localStorage.getItem("token");
    console.log("Token status:", { hasToken: !!token, tokenPreview: token ? `${token.substring(0, 20)}...` : 'none' });
    
    socket.auth = { token };

    const emitJoin = () => {
      console.log("📤 Emitting join-session event", { sessionId, socketId: socket.id });
      socket.emit("join-session", sessionId);
    };

    if (!socket.connected) {
      console.log("🔌 Socket not connected, connecting first...");
      socket.connect();
      
      // Wait for connection then emit
      socket.once('connect', () => {
        console.log("✅ Socket connected, now emitting join-session");
        emitJoin();
      });
    } else {
      console.log("✅ Socket already connected, emitting join-session immediately");
      emitJoin();
    }
  }, [sessionId]);

  const leaveSession = useCallback(() => {
    console.log("👋 leaveSession called", { sessionId, socketConnected: socket.connected });
    
    if (sessionId && socket.connected) {
      socket.emit("leave-room", sessionId);
      setIsUserJoined(false);
      console.log("📤 Emitted leave-room event");
    }
  }, [sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      console.log("❌ Participant presence not enabled or no sessionId");
      return;
    }

    console.log("🎯 Setting up participant presence for session:", sessionId);

    // Get current user ID
    const currentUserId = normalizeUserId(currentUser?._id);
    console.log("Current user ID (normalized):", currentUserId);

    // Socket event handlers
    const handleParticipantsUpdate = ({ participants, participantCount }) => {
      console.log("📊 Participants update received:", { participants, participantCount });
      
      setParticipants(participants);
      setParticipantCount(participantCount);
      
      // Check if current user is in the participants list
      const normalizedParticipants = participants.map(id => normalizeUserId(id));
      const userIsJoined = normalizedParticipants.includes(currentUserId);
      
      console.log("User join status check:", {
        currentUserId,
        normalizedParticipants,
        userIsJoined
      });
      
      setIsUserJoined(userIsJoined);
    };

    const handleUserJoined = ({ userId, participantCount }) => {
      console.log("👤 User joined event:", { userId, participantCount });
      
      setParticipants(prev => {
        const normalizedUserId = normalizeUserId(userId);
        const normalizedPrev = prev.map(id => normalizeUserId(id));
        
        if (!normalizedPrev.includes(normalizedUserId)) {
          console.log("➕ Adding user to participants list");
          return [...prev, userId];
        }
        console.log("⚠️ User already in participants list");
        return prev;
      });
      
      setParticipantCount(participantCount);
      
      // Check if the joined user is the current user
      const normalizedJoinedUserId = normalizeUserId(userId);
      console.log("Checking if joined user is current user:", {
        normalizedJoinedUserId,
        currentUserId,
        isMatch: normalizedJoinedUserId === currentUserId
      });
      
      if (normalizedJoinedUserId === currentUserId) {
        console.log("✅ Current user successfully joined - setting isUserJoined to true");
        setIsUserJoined(true);
      }
    };

    const handleUserLeft = ({ userId, participantCount }) => {
      console.log("👋 User left event:", { userId, participantCount });
      
      const normalizedLeftUserId = normalizeUserId(userId);
      
      setParticipants(prev => {
        const filtered = prev.filter(id => normalizeUserId(id) !== normalizedLeftUserId);
        console.log("Participants after removal:", filtered);
        return filtered;
      });
      
      setParticipantCount(participantCount);
      
      // Check if the left user is the current user
      if (normalizedLeftUserId === currentUserId) {
        console.log("❌ Current user left - setting isUserJoined to false");
        setIsUserJoined(false);
      }
    };

    const handleConnect = () => {
      console.log("✅ Socket connected in useParticipantPresence", { socketId: socket.id });
    };

    const handleDisconnect = (reason) => {
      console.log("❌ Socket disconnected:", reason);
      // Reset user joined state on disconnect
      setIsUserJoined(false);
      setParticipants([]);
      setParticipantCount(0);
    };

    const handleConnectError = (error) => {
      console.error("❌ Socket connection error:", error);
    };

    // Set up socket listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("participants-update", handleParticipantsUpdate);

    // Ensure socket connection with auth
    socket.auth = {
      token: localStorage.getItem("token")
    };

    if (!socket.connected) {
      console.log("🔌 Connecting socket...");
      socket.connect();
    }

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up participant presence listeners for session:", sessionId);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("participants-update", handleParticipantsUpdate);
    };
  }, [sessionId, enabled, currentUser, normalizeUserId]);

  return {
    participants,
    participantCount,
    isUserJoined,
    joinSession,
    leaveSession
  };
};

export default useParticipantPresence;