import interviewSessionModel from "../models/interviewSession.model.js";

const sessionAccessMiddleware = async (req, res, next) => {
  try {
    const session = await interviewSessionModel.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const userId = req.user._id.toString();

    if (
      session.interviewerId.toString() !== userId &&
      session.intervieweeId.toString() !== userId
    ) {
      return res.status(403).json({ message: "Access denied to this session" });
    }

    req.session = session;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Session access error" });
  }
};

export default sessionAccessMiddleware;
