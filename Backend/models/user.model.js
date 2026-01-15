import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false, select: false },
  googleId: { type: String, required: false, unique: true, sparse: true },

  roles: {
    type: [String],
    enum: ["ADMIN", "INTERVIEWER", "INTERVIEWEE"],
    validate: [arr => arr.length > 0, "At least one role is required"],
    default: ["INTERVIEWEE"]
  },

  skills: [String], // ["DSA", "MERN", "System Design"]

  experienceLevel: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"]
  },

  timezone: {
    type: String,
    default: "UTC"
  },

  availability: [
    {
      startTime: {
        type: Date, //UTC date time
        required: true
      },
      endTime: {
        type: Date, //UTC date time
        required: true
      }
    }
  ],

  stats: {
    interviewsGiven: { type: Number, default: 0 },
    interviewsTaken: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
  },

}, { timestamps: true });

UserSchema.pre("save", function (next) {
  if (this.isNew && this.roles.includes("ADMIN") && !this.$locals.isSeededAdmin) {
    return next(new Error("Admin role cannot be self-assigned"));
  }
  next();
});


UserSchema.pre("save", function (next) {
  for (const slot of this.availability) {
    if (slot.startTime >= slot.endTime) {
      return next(new Error("Availability startTime must be before endTime"));
    }
  }
  next();
});

const userModel = mongoose.models.user || mongoose.model("user", UserSchema);
export default userModel