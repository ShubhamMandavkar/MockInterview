import interviewRequestModel from "../models/interviewRequest.model.js";
import interviewSessionModel from "../models/interviewSession.model.js";
import mongoose from "mongoose";
import { emitToUser } from "../sockets/socket.js";

/**
 * @desc    Create interview request (Interviewee)
 * @route   POST /api/interview-requests
 * @access  Private
 */
export const createRequest = async (req, res) => {
    try {
        const {
            skills,
            difficulty,
            interviewTypes,
            scheduledAt,
            duration
        } = req.body;

        if (!skills || !difficulty || !scheduledAt) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        const EXPIRY_BUFFER_HOURS = Number(process.env.REQUEST_EXPIRY_BUFFER_HOURS) || 5;

        const scheduledTime = new Date(scheduledAt);
        const expiresAt = null;

        // const expiresAt = new Date(
        //     scheduledTime.getTime() - EXPIRY_BUFFER_HOURS * 60 * 60 * 1000
        // );


        //temporarily disabling this check to allow immediate interviews
        // if (expiresAt <= new Date()) {
        //     return res.status(400).json({
        //         message: "Interview time must be at least 5 hours in the future"
        //     });
        // }

        const request = await interviewRequestModel.create({
            createdBy: req.user._id,
            skills,
            difficulty,
            interviewTypes,
            scheduledAt: scheduledTime,
            duration,
            expiresAt
        });

        res.status(201).json({
            message: "Interview request created",
            request
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to create interview request" });
    }
};

/**
 * @desc    Get open interview requests (Interviewer view)
 * @route   GET /api/interview-requests/open
 * @access  Private (INTERVIEWER)
 */
export const getOpenRequests = async (req, res) => {
    try {
        const now = new Date();
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const requests = await interviewRequestModel.find({
            status: "OPEN",
            createdBy: { $ne: userId },
            scheduledAt: { $gte: new Date() },
            $or: [
                { expiresAt: { $gte: now } },
                { expiresAt: null }
              ]
        })
        .populate('createdBy', 'name email skills') // Populate user data with skills
        .sort({ scheduledAt: 1 });

        res.status(200).json(requests);
    } catch (error) {
        console.error("Error fetching open requests:", error);
        res.status(500).json({ message: "Failed to fetch open requests", error: error } );
    }
};

/**
 * @desc    Get logged-in user's interview requests
 * @route   GET /api/interview-requests/mine
 * @access  Private
 */
export const getMyRequests = async (req, res) => {
    try {
        const now = new Date();

        const requests = await interviewRequestModel.find({
            createdBy: req.user._id
        })
        .populate('createdBy', 'name email skills') // Populate user data with skills
        .populate('acceptedBy', 'name email') // Also populate acceptedBy for consistency
        .sort({ createdAt: -1 });

        //teimporarily disabling isExpired field
        const enriched = requests.map(reqDoc => reqDoc.toObject()); //temporarily disabling isExpired field

        // const enriched = requests.map(reqDoc => { // Add isExpired field
        //     const isExpired =
        //         reqDoc.status === "OPEN" &&
        //         reqDoc.expiresAt &&
        //         reqDoc.expiresAt < now;

        //     return {
        //         ...reqDoc.toObject(),
        //         isExpired
        //     };
        // });

        res.status(200).json(enriched);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Failed to fetch your requests" });
    }
};


/**
 * @desc    Accept interview request (Interviewer)
 * @route   POST /api/interview-requests/:id/accept
 * @access  Private (INTERVIEWER)
 */
export const acceptRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const requestId = req.params.id;

        const request = await interviewRequestModel.findById(requestId).session(session);

        if (!request) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Interview request not found" });
        }

        if (request.status !== "OPEN") {
            await session.abortTransaction();
            return res.status(400).json({ message: "Request already accepted or expired" });
        }

        if (request.createdBy.toString() === req.user._id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({ message: "You cannot accept your own request" });
        }

        // Create interview session
        const interviewSession = await interviewSessionModel.create(
            [{
                requestId: request._id,
                intervieweeId: request.createdBy,
                interviewerId: req.user._id,
                duration: request.duration,
                status: "SCHEDULED"
            }],
            { session }
        );

        // Update request
        request.status = "ACCEPTED";
        request.acceptedBy = req.user._id;
        request.expiresAt = null; // IMPORTANT: Clear expiry since it's accepted
        request.linkedInterviewSessionId = interviewSession[0]._id;
        request.respondedAt = new Date();
        await request.save({ session });

        await session.commitTransaction();

        // Populate the created session with interviewer details for socket emission
        const populatedSession = await interviewSessionModel
            .findById(interviewSession[0]._id)
            .populate('interviewerId', 'name email')
            .populate('requestId', 'scheduledAt skills difficulty interviewTypes');

        // Emit socket event to notify interviewee of new session
        try {
            const intervieweeId = request.createdBy.toString();
            
            // Emit to specific user
            const emitted = emitToUser(intervieweeId, 'session-created', {
                sessionId: populatedSession._id,
                intervieweeId: intervieweeId,
                scheduledAt: populatedSession.requestId.scheduledAt,
                interviewer: {
                    id: populatedSession.interviewerId._id,
                    name: populatedSession.interviewerId.name,
                    email: populatedSession.interviewerId.email
                },
                skills: populatedSession.requestId.skills,
                difficulty: populatedSession.requestId.difficulty,
                interviewTypes: populatedSession.requestId.interviewTypes,
                duration: populatedSession.duration
            });
            
            if (emitted) {
                console.log(`✅ Emitted session-created event to interviewee ${intervieweeId}, session ${populatedSession._id}`);
            } else {
                console.log(`⚠️ Interviewee ${intervieweeId} not connected, session-created event not delivered`);
            }
        } catch (socketError) {
            console.error('❌ Failed to emit session-created event:', socketError);
            // Don't fail the request if socket emission fails
        }

        res.status(200).json({
            message: "Interview request accepted",
            sessionId: interviewSession[0]._id
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: "Failed to accept interview request" });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get interview request by ID
 * @route   GET /api/interview-requests/:id
 * @access  Private
 */
export const getRequestById = async (req, res) => {
    try {
        const requestId = req.params.id;
        const request = await interviewRequestModel.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Interview request not found" });
        }

        // Check if user is authorized to view this request
        if (request.createdBy.toString() !== req.user._id.toString() && 
            !req.user.roles.includes('INTERVIEWER') && 
            !req.user.roles.includes('ADMIN')) {
            return res.status(403).json({ message: "Not authorized to view this request" });
        }

        res.status(200).json(request);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch interview request" });
    }
};

/**
 * @desc    Update interview request
 * @route   PUT /api/interview-requests/:id
 * @access  Private
 */
export const updateRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { skills, difficulty, interviewTypes, scheduledAt, duration } = req.body;

        const request = await interviewRequestModel.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Interview request not found" });
        }

        // Check if user owns this request
        if (request.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to update this request" });
        }

        // Check if request can be updated (only OPEN requests)
        if (request.status !== "OPEN") {
            return res.status(400).json({ message: "Cannot update accepted or expired requests" });
        }

        // Validate required fields
        if (!skills || !difficulty || !scheduledAt) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        const EXPIRY_BUFFER_HOURS = Number(process.env.REQUEST_EXPIRY_BUFFER_HOURS) || 5;
        const scheduledTime = new Date(scheduledAt);
        const expiresAt = new Date(scheduledTime.getTime() - EXPIRY_BUFFER_HOURS * 60 * 60 * 1000);

        if (expiresAt <= new Date()) {
            return res.status(400).json({
                message: "Interview time must be at least 5 hours in the future"
            });
        }

        // Update the request
        request.skills = skills;
        request.difficulty = difficulty;
        request.interviewTypes = interviewTypes;
        request.scheduledAt = scheduledTime;
        request.duration = duration;
        request.expiresAt = expiresAt;
        request.updatedAt = new Date();

        await request.save();

        res.status(200).json({
            message: "Interview request updated successfully",
            request
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to update interview request" });
    }
};

/**
 * @desc    Delete interview request
 * @route   DELETE /api/interview-requests/:id
 * @access  Private
 */
export const deleteRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const request = await interviewRequestModel.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Interview request not found" });
        }

        // Check if user owns this request
        if (request.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to delete this request" });
        }

        // Check if request can be deleted (only OPEN requests)
        if (request.status !== "OPEN") {
            return res.status(400).json({ message: "Cannot delete accepted requests" });
        }

        await interviewRequestModel.findByIdAndDelete(requestId);

        res.status(200).json({ message: "Interview request deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete interview request" });
    }
};
