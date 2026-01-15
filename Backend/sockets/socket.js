import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import interviewSessionModel from "../models/interviewSession.model.js";

let io; // Store the io instance globally
let userConnections; // Store user connections globally

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true
    }
  });

  // Track participants in each session room
  const sessionParticipants = new Map();
  
  // Track user connections by user ID
  userConnections = new Map(); // userId -> Set of socket IDs

  // Helper function to normalize user IDs
  const normalizeUserId = (id) => {
    if (!id) return null;
    return id.toString();
  };

  // Socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      console.log("Socket authentication attempt:", { 
        hasToken: !!token, 
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
        socketId: socket.id
      });
      
      if (!token) {
        console.log("No token provided for socket authentication");
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id }
      console.log("Socket authentication successful", { 
        userId: decoded.id,
        socketId: socket.id
      });

      next();
    } catch (err) {
      console.log("Socket authentication failed:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", { 
      userId: socket.user.id, 
      socketId: socket.id 
    });

    // Track user connection
    const userId = socket.user.id;
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(socket.id);
    
    console.log("User connection tracked:", {
      userId,
      socketId: socket.id,
      totalConnectionsForUser: userConnections.get(userId).size
    });

    /* ---------------------------
       Join interview session room
    ---------------------------- */
    socket.on("join-session", async (sessionId) => {
      console.log("📥 join-session event received", { 
        sessionId, 
        userId: socket.user.id,
        socketId: socket.id
      });
      
      try {
        const session = await interviewSessionModel.findById(sessionId);

        if (!session) {
          console.log("Session not found:", sessionId);
          socket.emit("error", { message: "Session not found" });
          return;
        }

        const userId = normalizeUserId(socket.user.id);
        const interviewerId = normalizeUserId(session.interviewerId);
        const intervieweeId = normalizeUserId(session.intervieweeId);

        const allowed = userId === interviewerId || userId === intervieweeId;

        if (!allowed) {
          console.log("User not allowed to join session");
          socket.emit("error", { message: "Not authorized to join this session" });
          return;
        }

        // Join the socket room
        socket.join(sessionId);
        socket.sessionId = sessionId;
        socket.userId = userId;

        // Track participant presence
        if (!sessionParticipants.has(sessionId)) {
          sessionParticipants.set(sessionId, new Set());
        }
        
        // Add user to participants
        const participants = sessionParticipants.get(sessionId);
        const wasAlreadyInSession = participants.has(userId);
        participants.add(userId);

        console.log("User joined session successfully", {
          userId,
          sessionId,
          participantCount: participants.size,
          participants: Array.from(participants),
          wasAlreadyInSession
        });

        // Notify the joining user about successful join
        socket.emit("user-joined", {
          userId,
          participantCount: participants.size
        });

        // Notify others in the room about new participant
        socket.to(sessionId).emit("user-joined", {
          userId,
          participantCount: participants.size
        });

        // // Send current participants list to the joining user  //duplicate call due to broadcasting below
        // socket.emit("participants-update", {
        //   participants: Array.from(participants),
        //   participantCount: participants.size
        // });

        // Also broadcast to everyone in the room
        io.to(sessionId).emit("participants-update", {
          participants: Array.from(participants),
          participantCount: participants.size
        });

        // CRITICAL: Emit "both-participants-ready" when exactly 2 participants join
        if (participants.size === 2) {
          console.log("Both participants ready!", {
            sessionId,
            participants: Array.from(participants),
            participantCount: 2
          });
          
          // Small delay to ensure both clients have processed join
          setTimeout(() => {
            io.to(sessionId).emit("both-participants-ready", {
              sessionId,
              participantCount: 2,
              participants: Array.from(participants)
            });
            console.log("Emitted both-participants-ready event");
          }, 500);
        }

      } catch (error) {
        console.error("Error in join-session:", error);
        socket.emit("error", { message: "Failed to join session" });
      }
    });

    /* ---------------------------
       Leave session room
    ---------------------------- */
    socket.on("leave-room", (sessionId) => {
      console.log("leave-room event received", {
        sessionId,
        userId: socket.userId,
        socketId: socket.id
      });

      if (socket.sessionId === sessionId && socket.userId) {
        // Remove from participants tracking
        if (sessionParticipants.has(sessionId)) {
          sessionParticipants.get(sessionId).delete(socket.userId);
          
          const remainingCount = sessionParticipants.get(sessionId).size;
          
          console.log("User left session", {
            userId: socket.userId,
            sessionId,
            remainingParticipants: remainingCount
          });
          
          // Notify others about participant leaving
          socket.to(sessionId).emit("user-left", {
            userId: socket.userId,
            participantCount: remainingCount
          });

          // Also notify the leaving user
          socket.emit("user-left", {
            userId: socket.userId,
            participantCount: remainingCount
          });

          // Broadcast updated participants list
          io.to(sessionId).emit("participants-update", {
            participants: Array.from(sessionParticipants.get(sessionId)),
            participantCount: remainingCount
          });

          // Clean up empty session
          if (remainingCount === 0) {
            sessionParticipants.delete(sessionId);
            console.log("Session participants map cleaned up (empty)");
          }
        }

        socket.leave(sessionId);
        socket.sessionId = null;
        socket.userId = null;
      }
    });

    /* ---------------------------
       WebRTC signaling events
    ---------------------------- */
    socket.on("webrtc-offer", ({ sessionId, offer }) => {
      console.log("Forwarding WebRTC offer", { 
        sessionId, 
        from: socket.userId,
        socketId: socket.id
      });
      socket.to(sessionId).emit("webrtc-offer", offer);
    });

    socket.on("webrtc-answer", ({ sessionId, answer }) => {
      console.log("Forwarding WebRTC answer", { 
        sessionId, 
        from: socket.userId,
        socketId: socket.id
      });
      socket.to(sessionId).emit("webrtc-answer", answer);
    });

    socket.on("webrtc-ice-candidate", ({ sessionId, candidate }) => {
      console.log("Forwarding ICE candidate", { 
        sessionId, 
        from: socket.userId,
        socketId: socket.id
      });
      socket.to(sessionId).emit("webrtc-ice-candidate", candidate);
    });

    /* ---------------------------
       Media state signaling
    ---------------------------- */
    socket.on("participant-media-state", ({ sessionId, micOn, cameraOn }) => {
      console.log("Forwarding media state", { 
        sessionId, 
        from: socket.userId,
        micOn,
        cameraOn,
        socketId: socket.id
      });
      // Forward to other participants in the session
      socket.to(sessionId).emit("participant-media-state", { micOn, cameraOn });
    });

    /* ---------------------------
       Handle disconnection
    ---------------------------- */
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected", { 
        userId: socket.user?.id,
        socketId: socket.id,
        reason 
      });
      
      // Clean up user connection tracking
      const userId = socket.user?.id;
      if (userId && userConnections.has(userId)) {
        userConnections.get(userId).delete(socket.id);
        if (userConnections.get(userId).size === 0) {
          userConnections.delete(userId);
        }
        console.log("User connection cleaned up:", {
          userId,
          socketId: socket.id,
          remainingConnectionsForUser: userConnections.get(userId)?.size || 0
        });
      }
      
      // Clean up participant tracking on disconnect
      if (socket.sessionId && socket.userId) {
        if (sessionParticipants.has(socket.sessionId)) {
          sessionParticipants.get(socket.sessionId).delete(socket.userId);
          
          const remainingCount = sessionParticipants.get(socket.sessionId).size;
          
          console.log("Cleaning up disconnected user", {
            userId: socket.userId,
            sessionId: socket.sessionId,
            remainingParticipants: remainingCount
          });
          
          // Notify others about participant leaving
          socket.to(socket.sessionId).emit("user-left", {
            userId: socket.userId,
            participantCount: remainingCount
          });

          // Broadcast updated participants list
          io.to(socket.sessionId).emit("participants-update", {
            participants: Array.from(sessionParticipants.get(socket.sessionId)),
            participantCount: remainingCount
          });

          // Clean up empty session
          if (remainingCount === 0) {
            sessionParticipants.delete(socket.sessionId);
            console.log("🧹 Session participants map cleaned up (empty)");
          }
        }
      }
    });
  });

  io.on("connection_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  console.log("Socket.IO server initialized");
  
  return io;
};

// Export function to get io instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Export function to emit to specific user
export const emitToUser = (userId, event, data) => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  
  // Get all socket connections for this user
  const userSockets = userConnections.get(userId);
  if (userSockets && userSockets.size > 0) {
    userSockets.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
    console.log(`Emitted ${event} to user ${userId} (${userSockets.size} connections)`);
    return true;
  } else {
    console.log(`No active connections found for user ${userId}`);
    return false;
  }
};