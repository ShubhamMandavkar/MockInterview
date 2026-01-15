import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  createRequest,
  getOpenRequests,
  getMyRequests,
  acceptRequest,
  updateRequest,
  deleteRequest,
  getRequestById
} from "../controllers/interviewRequest.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createRequest);
router.get("/open", authMiddleware, getOpenRequests);
router.get("/mine", authMiddleware, getMyRequests);
router.get("/:id", authMiddleware, getRequestById);
router.put("/:id", authMiddleware, updateRequest);
router.delete("/:id", authMiddleware, deleteRequest);
router.post("/:id/accept", authMiddleware, acceptRequest);

export default router;
