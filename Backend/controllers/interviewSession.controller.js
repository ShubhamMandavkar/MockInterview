import mongoose from "mongoose";
import interviewSessionModel from "../models/interviewSession.model.js";
import userModel from "../models/user.model.js";
import questionModel from "../models/question.model.js";
import sessionQuestionModel from "../models/sessionQuestion.model.js";
import { emitToUser } from "../sockets/socket.js";

const INTERVIEWEE_WAIT_MINUTES = 5;

/**
 * @desc    Get interview sessions for interviewer / interviewee
 * @route   GET /api/interview-sessions
 * @access  Private
 *
 * Query params:
 * - role: interviewer | interviewee (optional)
 * - status: SCHEDULED | LIVE | COMPLETED | CANCELLED (optional)
 * - limit: number (optional)
 */
export const getMySessions = async (req, res) => {
    try {
        const { role, status, limit } = req.query;
        const userId = req.user._id;

        /* ---------------------------------
           1. Role-based filter
        ---------------------------------- */
        let roleFilter = {};

        if (role === "interviewer") {
            roleFilter.interviewerId = userId;
        } else if (role === "interviewee") {
            roleFilter.intervieweeId = userId;
        } else {
            // default → both roles
            roleFilter.$or = [
                { interviewerId: userId },
                { intervieweeId: userId }
            ];
        }

        /* ---------------------------------
           2. Status filter
           IMPORTANT: upcoming = SCHEDULED + LIVE
           We do NOT filter by time
        ---------------------------------- */
        let statusFilter = {};

        if (status) {
            // explicit status requested
            statusFilter.status = status;
        } else {
            // default: upcoming sessions
            statusFilter.status = { $in: ["SCHEDULED", "LIVE"] };
        }

        /* ---------------------------------
           3. Build final query
        ---------------------------------- */
        const query = {
            ...roleFilter,
            ...statusFilter
        };

        /* ---------------------------------
           4. Fetch sessions
        ---------------------------------- */
        let sessions = await interviewSessionModel
            .find(query)
            .populate("interviewerId", "name email")
            .populate("intervieweeId", "name email")
            .populate({
                path: "requestId",
                select: "scheduledAt duration skills difficulty interviewTypes"
            });

        /* ---------------------------------
           5. Sort by scheduled time (UX)
           - Waiting / overdue sessions stay visible
           - LIVE sessions still appear
        ---------------------------------- */
        sessions.sort((a, b) => {
            const timeA =
                a.requestId?.scheduledAt
                    ? new Date(a.requestId.scheduledAt)
                    : a.startedAt || a.createdAt;

            const timeB =
                b.requestId?.scheduledAt
                    ? new Date(b.requestId.scheduledAt)
                    : b.startedAt || b.createdAt;

            return timeA - timeB;
        });

        /* ---------------------------------
           6. Apply limit (optional)
        ---------------------------------- */
        if (limit) {
            sessions = sessions.slice(0, Number(limit));
        }

        res.status(200).json(sessions);
    } catch (error) {
        console.error("getMySessions error:", error);
        res.status(500).json({ message: "Failed to fetch sessions" });
    }
};


/**
 * @desc    Get interview session details
 * @route   GET /api/interview-sessions/:id
 * @access  Private (participants only)
 */
export const getSession = async (req, res) => {
    try {
        const sessionId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: "Invalid session ID" });
        }

        const session = await interviewSessionModel
            .findById(sessionId)
            .populate("interviewerId", "name email")
            .populate("intervieweeId", "name email")
            .populate({
                path: "requestId",
                select: "scheduledAt duration skills difficulty interviewTypes"
            });

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        const userId = req.user._id.toString();

        if (
            session.interviewerId._id.toString() !== userId &&
            session.intervieweeId._id.toString() !== userId
        ) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(session);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch session" });
    }
};

/**
 * @desc    Start interview session
 * @route   POST /api/interview-sessions/:id/start
 * @access  Private (Interviewer only)
 *
 * Transitions: SCHEDULED → LIVE
 */
export const startSession = async (req, res) => {
    try {
        const session = await interviewSessionModel.findById(req.params.id).populate("requestId", "scheduledAt");;

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // ONLY interviewer can start
        if (session.interviewerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Only interviewer can start the session"
            });
        }

        // Idempotent behavior
        if (session.status === "LIVE") {
            return res.status(200).json({
                message: "Session already live",
                session
            });
        }

        if (session.status !== "SCHEDULED") {
            return res.status(400).json({
                message: "Session cannot be started in current state"
            });
        }
        const now = new Date();
        const scheduledAt = session.requestId?.scheduledAt;

        if (scheduledAt && now < new Date(scheduledAt)) {
            return res.status(400).json({
                message: "Cannot start session before scheduled time"
            });
        }

        session.status = "LIVE";
        session.startedAt = new Date();
        await session.save();

        // Emit socket event for session started
        try {
            // Emit to both interviewer and interviewee
            const interviewerId = session.interviewerId.toString();
            const intervieweeId = session.intervieweeId.toString();
            
            const eventData = {
                sessionId: req.params.id,
                status: 'LIVE',
                startedAt: session.startedAt
            };
            
            emitToUser(interviewerId, 'session-started', eventData);
            emitToUser(intervieweeId, 'session-started', eventData);
            
            console.log(`✅ Emitted session-started event to interviewer ${interviewerId} and interviewee ${intervieweeId}`);
        } catch (socketError) {
            console.error('❌ Failed to emit session-started event:', socketError);
        }

        res.status(200).json({
            message: "Interview session started",
            session
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Failed to start session" });
    }
};

/**
 * @desc    mark interview joined the session
 * @route   POST /api/interview-sessions/:id/mark-interviewee-joined
 * @access  Private (Interviewee only)
 *
 */
export const markIntervieweeJoined = async (req, res) => {
    try {
        const sessionId = req.params.id;
        console.log('markIntervieweeJoined called for session:', sessionId, 'by user:', req.user._id);

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            console.log('Invalid session ID:', sessionId);
            return res.status(400).json({ message: "Invalid session ID" });
        }

        const session = await interviewSessionModel.findById(sessionId);

        if (!session) {
            console.log('Session not found:', sessionId);
            return res.status(404).json({ message: "Session not found" });
        }

        console.log('Session found:', {
            id: session._id,
            status: session.status,
            intervieweeId: session.intervieweeId,
            interviewerId: session.interviewerId,
            firstIntervieweeJoinedAt: session.firstIntervieweeJoinedAt
        });

        if (session.status !== "LIVE") {
            console.log('Session is not LIVE, current status:', session.status);
            return res.status(400).json({
                message: "Interviewee can only join a LIVE session"
            });
        }

        if (session.intervieweeId.toString() !== req.user._id.toString()) {
            console.log('User is not the interviewee for this session. Expected:', session.intervieweeId.toString(), 'Got:', req.user._id.toString());
            return res.status(403).json({
                message: "Only interviewee can mark interviewee joined"
            });
        }

        if (!session.firstIntervieweeJoinedAt) {
            console.log('Setting firstIntervieweeJoinedAt for session:', sessionId);
            session.firstIntervieweeJoinedAt = new Date();
            await session.save();
            console.log('Successfully saved firstIntervieweeJoinedAt:', session.firstIntervieweeJoinedAt);

            return res.status(200).json({
                message: "Interviewee join time recorded",
                firstIntervieweeJoinedAt: session.firstIntervieweeJoinedAt
            });
        }

        // Idempotent success
        console.log('Interviewee already marked as joined at:', session.firstIntervieweeJoinedAt);
        return res.status(200).json({
            message: "Interviewee already marked as joined",
            firstIntervieweeJoinedAt: session.firstIntervieweeJoinedAt
        });

    } catch (error) {
        console.error("markIntervieweeJoined error:", error);
        res.status(500).json({ message: "Failed to mark interviewee joined" });
    }
};

/**
 * @desc    End interview session
 * @route   POST /api/interview-sessions/:id/end
 * @access  Private (Interviewer only)
 *
 * Transitions: LIVE → COMPLETED
 */
export const endSession = async (req, res) => {
    try {
        const session = await interviewSessionModel.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // ONLY interviewer can end
        if (session.interviewerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Only interviewer can end the session"
            });
        }

        // Idempotent behavior
        if (
            ["COMPLETED", "NO_SHOW_INTERVIEWER", "NO_SHOW_INTERVIEWEE"].includes(session.status)
        ) {
            return res.status(200).json({
                message: "Session already ended",
                session
            });
        }

        if (session.status !== "LIVE") {
            return res.status(400).json({
                message: "Only LIVE sessions can be ended"
            });
        }

        const now = new Date();

        // Interviewee never joined
        if (!session.firstIntervieweeJoinedAt) {
            const waitedMinutes = (now - session.startedAt) / (1000 * 60);

            session.status =
                waitedMinutes >= INTERVIEWEE_WAIT_MINUTES
                    ? "NO_SHOW_INTERVIEWEE"
                    : "NO_SHOW_INTERVIEWER";

            session.endedAt = now;
            await session.save();

            // Emit socket event for session ended (no-show)
            try {
                const { emitToUser } = await import("../sockets/socket.js");
                
                // Emit to both interviewer and interviewee
                const interviewerId = session.interviewerId.toString();
                const intervieweeId = session.intervieweeId.toString();
                
                const eventData = {
                    sessionId: req.params.id,
                    status: session.status,
                    endedAt: session.endedAt
                };
                
                emitToUser(interviewerId, 'session-ended', eventData);
                emitToUser(intervieweeId, 'session-ended', eventData);
                
                console.log(`✅ Emitted session-ended event to interviewer ${interviewerId} and interviewee ${intervieweeId} (${session.status})`);
            } catch (socketError) {
                console.error('❌ Failed to emit session-ended event:', socketError);
            }

            return res.status(200).json({ message: "Session ended", session });
        }

        session.status = "COMPLETED";
        session.endedAt = new Date();
        await session.save();

        // Emit socket event for session ended
        try {
            // Emit to both interviewer and interviewee
            const interviewerId = session.interviewerId.toString();
            const intervieweeId = session.intervieweeId.toString();
            
            const eventData = {
                sessionId: req.params.id,
                status: 'COMPLETED',
                endedAt: session.endedAt
            };
            
            emitToUser(interviewerId, 'session-ended', eventData);
            emitToUser(intervieweeId, 'session-ended', eventData);
            
            console.log(`✅ Emitted session-ended event to interviewer ${interviewerId} and interviewee ${intervieweeId}`);
        } catch (socketError) {
            console.error('❌ Failed to emit session-ended event:', socketError);
        }

        // ---- UPDATE STATS (ATOMIC) ----
        await Promise.all([
            userModel.updateOne(
                { _id: session.interviewerId },
                { $inc: { "stats.interviewsTaken": 1 } }
            ),
            userModel.updateOne(
                { _id: session.intervieweeId },
                { $inc: { "stats.interviewsGiven": 1 } }
            )
        ]);

        res.status(200).json({
            message: "Interview session completed",
            session
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Failed to end session", error: error });
    }
};

/**
 * @desc    extend duration of interview session
 * @route   POST /api/interview-sessions/:id/extend
 * @access  Private (Interviewer only)
 */

export const extendSession = async (req, res) => {
    try {
        const { extraMinutes = 15 } = req.body;

        const session = await interviewSessionModel.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        if (session.interviewerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Only interviewer can extend the session"
            });
        }

        if (session.status !== "LIVE") {
            return res.status(400).json({
                message: "Only LIVE sessions can be extended"
            });
        }

        session.extendedBy += extraMinutes;
        await session.save();

        res.status(200).json({
            message: `Interview extended by ${extraMinutes} minutes`,
            totalDuration: session.duration + session.extendedBy
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to extend session" });
    }
};


/**
 * @desc    add question to interview session which are asked or to be asked during the session
 * @route   POST /api/interview-sessions/:id/questions
 * @access  Private (Interviewer only)
 */
export const addSessionQuestion = async (req, res) => {
    try {
        const sessionId = req.params.id; // Changed from req.params.sessionId
        const { questionId, customQuestionText } = req.body;

        if (!questionId && !customQuestionText) {
            return res.status(400).json({
                message: "Either questionId or customQuestionText is required"
            });
        }

        const session = await interviewSessionModel.findById(sessionId);

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Only LIVE sessions
        if (session.status !== "LIVE") {
            return res.status(400).json({
                message: "Questions can only be added during a live session"
            });
        }

        // Only interviewer can add questions
        if (session.interviewerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Only interviewer can add questions"
            });
        }

        // If predefined question, validate it exists & is active
        if (questionId) {
            const question = await questionModel.findOne({
                _id: questionId,
                isDeleted: false
            });

            if (!question) {
                return res.status(404).json({
                    message: "Question not found or deleted"
                });
            }

            const alreadyAsked = await sessionQuestionModel.findOne({
                sessionId,
                questionId
            });

            if (alreadyAsked) {
                return res.status(409).json({
                    message: "This question has already been asked in this session"
                });
            }
        }

        const sessionQuestion = await sessionQuestionModel.create({
            sessionId,
            questionId: questionId || null,
            customQuestionText: customQuestionText || null,
            askedAt: new Date()
        });

        res.status(201).json({
            message: "Question added to session",
            sessionQuestion
        });
    } catch (error) {
        console.error("addSessionQuestion:", error.message);
        res.status(500).json({ message: "Failed to add session question" });
    }
};


/**
 * @desc    Query questions asked in an interview session
 * @route   GET /api/interview-sessions/:id/questions
 * @access  Private (participants only)
 */
export const getSessionQuestions = async (req, res) => {
    try {
        const sessionId = req.params.id; // Changed from req.params.sessionId

        const session = await interviewSessionModel.findById(sessionId);

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        const userId = req.user._id.toString();

        // Only participants can view
        if (
            session.interviewerId.toString() !== userId &&
            session.intervieweeId.toString() !== userId
        ) {
            return res.status(403).json({
                message: "You are not a participant of this session"
            });
        }

        const questions = await sessionQuestionModel
            .find({ sessionId })
            .populate({
                path: "questionId",
                select: "questionText type difficulty category topic"
            })
            .sort({ askedAt: 1 });

        // Normalize response for frontend
        const formattedQuestions = questions.map(q => ({
            _id: q._id,
            questionText: q.questionId
                ? q.questionId.questionText
                : q.customQuestionText,
            type: q.questionId?.type || "CUSTOM",
            difficulty: q.questionId?.difficulty || null,
            category: q.questionId?.category || null,
            topic: q.questionId?.topic || null,
            askedAt: q.askedAt,
            isCustom: !q.questionId
        }));

        res.status(200).json(formattedQuestions);
    } catch (error) {
        console.error("getSessionQuestions:", error.message);
        res.status(500).json({ message: "Failed to fetch session questions" });
    }
};
