import express from "express";
import { getProfile, updateProfile } from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

export default router;
