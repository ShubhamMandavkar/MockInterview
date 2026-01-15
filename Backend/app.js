import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import 'dotenv/config';
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import interviewRequestRoutes from "./routes/interviewRequest.route.js";
import interviewSessionRoutes from "./routes/interviewSession.route.js";
import questionRoutes from "./routes/questions.route.js";
import feedbackRoutes from "./routes/feedback.route.js";
import errorMiddleware from "./middlewares/error.middleware.js";

import "./cron/endAbandonedSessions.js"; 


const app = express();

// connectDB();

app.use(express.json());
app.use(cors());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/interview-requests", interviewRequestRoutes);
app.use("/api/interview-sessions", interviewSessionRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use(errorMiddleware);

app.get("/", (req, res) => {
  res.send("Backend server is running");
});

// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

export default app;