import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import {
    addQuestion,
    updateQuestion,
    hardDeleteQuestion,
    softDeleteQuestion,
    getQuestions,
    restoreQuestion
} from "../controllers/question.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getQuestions);

router.post("/add", authMiddleware, adminMiddleware, addQuestion);
router.put("/:id", authMiddleware, adminMiddleware, updateQuestion);

router.delete("/:id", authMiddleware, adminMiddleware, softDeleteQuestion); // Soft delete
router.delete("/:id/hard", authMiddleware, adminMiddleware, hardDeleteQuestion); // Hard delete
router.patch("/:id/restore", authMiddleware, adminMiddleware, restoreQuestion); // Restore

export default router;
