import mongoose from 'mongoose'

const QuestionSchema = new mongoose.Schema({
  category: { type: String, required: true }, // "DSA", "MERN"
  topic: { type: String },                    // "Arrays", "React Hooks"

  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true
  },

  type: {
    type: String,
    enum: ["CODING", "CONCEPTUAL", "SYSTEM_DESIGN", "BEHAVIORAL"],
    required: true
  },

  questionText: { type: String, required: true },
  expectedAnswer: String, // optional (hidden from UI)

  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }

}, { timestamps: true });

const questionModel = mongoose.models.question || mongoose.model("question", QuestionSchema);
export default questionModel;
