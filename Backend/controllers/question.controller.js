import questionModel from "../models/question.model.js";
import mongoose from "mongoose";
import sessionQuestionModel from "../models/sessionQuestion.model.js";


/**
 * @desc    Get interview questions (filtered)
 * @route   GET /api/questions
 * @access  Private
 *
 * Query params (optional):
 * - category
 * - difficulty
 * - type
 * - limit
 * - includeDeleted (admin only)
 */
export const getQuestions = async (req, res) => {
    try {
        const { category, difficulty, type, limit = 10, includeDeleted } = req.query;

        // Base filter - include deleted questions only if explicitly requested and user is admin
        const filter = {};
        if (includeDeleted === 'true') {
            // Don't filter by isDeleted - include both active and deleted
        } else {
            filter.isDeleted = false;
        }
        
        if (category) filter.category = category;
        if (difficulty) filter.difficulty = difficulty;
        if (type) filter.type = type;

        const questions = await questionModel
            .find(filter)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        res.status(200).json(questions);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch questions" });
    }
};

/**
 * @desc    Add a new question
 * @route   POST /api/questions/add
 * @access  Private (ADMIN)
 */
export const addQuestion = async (req, res) => {
    try {
        const {
            category,
            topic,
            difficulty,
            type,
            questionText,
            expectedAnswer
        } = req.body;

        if (!category || !difficulty || !type || !questionText) {
            return res.status(400).json({
                message: "Required fields missing"
            });
        }

        const question = await questionModel.create({
            category,
            topic,
            difficulty,
            type,
            questionText,
            expectedAnswer
        });

        res.status(201).json({
            message: "Question added successfully",
            question
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to add question" });
    }
};

/**
 * @desc    Update a question
 * @route   PUT /api/questions/:id
 * @access  Private (ADMIN)
 */
export const updateQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid question ID" });
        }

        const allowedFields = ["title", "description", "difficulty", "tags"];
        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const question = await questionModel.findByIdAndUpdate(
            { _id: req.params.id, isDeleted: false },
            updates,
            { new: true, runValidators: true }
        );

        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        res.status(200).json({
            message: "Question updated",
            question
        });
    } catch (error) {
        console.error("updateQuestion error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete a question
 * @route   DELETE /api/questions/:id
 * @access  Private (ADMIN)
 * * Soft delete implementation (only marks as deleted without removing from DB)
 */
export const softDeleteQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid question ID" });
        }

        const question = await questionModel.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            {
                isDeleted: true,
                deletedAt: new Date()
            },
            { new: true }
        );

        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        res.status(200).json({
            message: "Question soft deleted successfully"
        });
    } catch (error) {
        console.error("softDeleteQuestion:", error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete a question
 * @route   DELETE /api/questions/:id/hard
 * @access  Private (ADMIN)
 * * hard delete implementation (removes from DB entirely)
 */

export const hardDeleteQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid question ID" });
        }

        const question = await questionModel.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        // Block hard delete if already soft-deleted (archived)
        if (question.isDeleted) {
            return res.status(403).json({
                message:
                    "Cannot permanently delete an archived question. Please restore it first if you want to delete it permanently."
            });
        }

        // Optional safety: block if already used in interviews
        const isUsed = await sessionQuestionModel.exists({
            questionId: req.params.id
        });

        if (isUsed) {
            return res.status(409).json({
                message: "Question is used in interviews. Cannot delete permanently."
            });
        }

        await questionModel.deleteOne({_id : req.params.id });

        res.status(200).json({
            message: "Question permanently deleted"
        });
    } catch (error) {
        console.error("hardDeleteQuestion:", error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Restore a soft-deleted question
 * @route   PATCH /api/questions/:id/restore
 * @access  Private (ADMIN)
 */
export const restoreQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid question ID" });
        }

        const question = await questionModel.findOneAndUpdate(
            { _id: req.params.id, isDeleted: true },
            {
                isDeleted: false,
                deletedAt: null
            },
            { new: true }
        );

        if (!question) {
            return res.status(404).json({ 
                message: "Question not found or not deleted" 
            });
        }

        res.status(200).json({
            message: "Question restored successfully",
            question
        });
    } catch (error) {
        console.error("restoreQuestion:", error.message);
        res.status(500).json({ message: error.message });
    }
};