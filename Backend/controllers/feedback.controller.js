import feedbackModel from "../models/feedback.model.js";
import interviewSessionModel from "../models/interviewSession.model.js";
import userModel from "../models/user.model.js";

/**
 * @desc    Submit feedback for an interview session
 * @route   POST /api/feedback
 * @access  Private (Session Participants)
 */
export const submitFeedback = async (req, res) => {
  try {
    const { sessionId, ratings, comments } = req.body;

    if (!sessionId || !ratings) {
      return res.status(400).json({
        message: "Session ID and ratings are required"
      });
    }

    const session = await interviewSessionModel.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Session must be completed
    if (session.status !== "COMPLETED") {
      return res.status(400).json({
        message: "Feedback can only be given after session completion"
      });
    }

    const userId = req.user._id.toString();

    const isInterviewer =
      session.interviewerId.toString() === userId;
    const isInterviewee =
      session.intervieweeId.toString() === userId;

    if (!isInterviewer && !isInterviewee) {
      return res.status(403).json({
        message: "You are not a participant of this session"
      });
    }

    const givenTo = isInterviewer
      ? session.intervieweeId
      : session.interviewerId;

    // Prevent duplicate feedback
    const existingFeedback = await feedbackModel.findOne({
      sessionId,
      givenBy: userId
    });

    if (existingFeedback) {
      return res.status(409).json({
        message: "You have already submitted feedback for this session"
      });
    }

    const feedback = await feedbackModel.create({
      sessionId,
      givenBy: userId,
      givenTo,
      ratings,
      comments
    });


    //computing new rating for interviewer
    if (isInterviewee) {
      const sessionRating = (ratings.technical + ratings.communication + ratings.problemSolving) / 3;
      await userModel.findByIdAndUpdate(givenTo, {
        $inc: {
          "stats.ratingSum": sessionRating,
          "stats.ratingCount": 1
        }
      });

      // Recalculate average rating
      const interviewer = await userModel.findById(givenTo);

      interviewer.stats.rating =
        Number(
          (interviewer.stats.ratingSum / interviewer.stats.ratingCount)
            .toFixed(2)
        );

      await interviewer.save();
    }

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback
    });
  } catch (error) {
    console.error("submitFeedback:", error.message);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
};

/**
 * @desc    Get feedback for a session
 * @route   GET /api/feedback/session/:sessionId
 * @access  Private (Participants)
 */
export const getSessionFeedback = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await interviewSessionModel.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const userId = req.user._id.toString();

    const isParticipant =
      session.interviewerId.toString() === userId ||
      session.intervieweeId.toString() === userId;

    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }

    const feedbacks = await feedbackModel.find({ sessionId })
      .populate("givenBy", "name")
      .populate("givenTo", "name");

    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
};
