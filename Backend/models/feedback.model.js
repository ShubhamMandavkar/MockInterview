import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "interviewSession",
      required: true
    },
  
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
  
    givenTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
  
    ratings: {
      technical: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      problemSolving: { type: Number, min: 1, max: 5 }
    },
  
    comments: String
  
  }, { timestamps: true });

//   FeedbackSchema.index(
//     { sessionId: 1, givenBy: 1 },
//     { unique: true }
//   );
  
  
const feedbackModel = mongoose.models.feedback || mongoose.model("feedback", FeedbackSchema);
export default feedbackModel;
  