import mongoose from "mongoose";

const SessionQuestionSchema = new mongoose.Schema({
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "interviewSession",
      required: true
    },
  
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "question"
    },
  
    customQuestionText: String, // Custom / Follow-Up Question
  
    askedAt: Date
  
  }, { timestamps: true });

  SessionQuestionSchema.pre("save", function(next) {
    if (!this.questionId && !this.customQuestionText) {
      return next(new Error("Either questionId or customQuestionText is required"));
    }
    next();
  });

//   SessionQuestionSchema.index({ sessionId: 1 });

  
const sessionQuestionModel = mongoose.models.sessionQuestion || mongoose.model("sessionQuestion", SessionQuestionSchema);
export default sessionQuestionModel;