import mongoose from "mongoose";

const InterviewRequestSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    skills: { type: [String], required: true },
    difficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard"],
        required: true
    },

    interviewTypes: {
        type: [String],
        enum: ["CODING", "CONCEPTUAL", "SYSTEM_DESIGN", "BEHAVIORAL"]
    },

    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60 }, // minutes

    // Expiry
    expiresAt: {
        type : Date,
        default: null
    }, // Auto-reject  if scheduled time is less than 5 hours and still OPEN

    status: {
        type: String,
        enum: ["OPEN", "ACCEPTED", "EXPIRED"],
        default: "OPEN"
    },

    // If Accepted
    linkedInterviewSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InterviewSession"
    }, // Reference to session if accepted

    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    }, // Who accepted the request

    respondedAt: Date, // When was it accepted


}, { timestamps: true });

InterviewRequestSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  );
  

const interviewRequestModel = mongoose.models.interviewRequestModel || mongoose.model("interviewRequest", InterviewRequestSchema);

export default interviewRequestModel;
