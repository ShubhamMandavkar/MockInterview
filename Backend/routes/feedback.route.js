import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  submitFeedback,
  getSessionFeedback
} from "../controllers/feedback.controller.js";

const router = express.Router();

router.post("/", authMiddleware, submitFeedback);
router.get("/session/:sessionId", authMiddleware, getSessionFeedback);

export default router;
