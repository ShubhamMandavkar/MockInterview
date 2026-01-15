import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  getMySessions,
  getSession,
  startSession,
  endSession,
  markIntervieweeJoined,
  extendSession,
  getSessionQuestions,
  addSessionQuestion
} from "../controllers/interviewSession.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getMySessions);
router.get("/:id", authMiddleware, getSession);
router.post("/:id/start", authMiddleware, startSession);
router.post("/:id/end", authMiddleware, endSession);
router.post("/:id/mark-interviewee-joined", authMiddleware, markIntervieweeJoined);
router.post("/:id/extend", authMiddleware, extendSession);

router.post("/:id/questions", authMiddleware, addSessionQuestion);
router.get("/:id/questions", authMiddleware, getSessionQuestions);

export default router;
