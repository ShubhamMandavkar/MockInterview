import mongoose from "mongoose";


const InterviewSessionSchema = new mongoose.Schema({
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "interviewRequest",
      required: true
    },
  
    intervieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
  
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
  
    status: {
      type: String,
      enum: ["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED", "NO_SHOW_INTERVIEWER", "NO_SHOW_INTERVIEWEE"],
      default: "SCHEDULED"
    },
  
    startedAt: Date,
    endedAt: Date,

    firstIntervieweeJoinedAt: Date,
    firstInterviewerJoinedAt: Date,

    
    duration: { type: Number, default: 60 }, // minutes (from request)
    extendedBy: { type: Number, default: 0 } // minutes
  
  }, { timestamps: true }
);

// InterviewSessionSchema.index({ requestId: 1 }, { unique: true });

  
const interviewSessionModel = mongoose.models.interviewSession || mongoose.model("interviewSession", InterviewSessionSchema);
export default interviewSessionModel;