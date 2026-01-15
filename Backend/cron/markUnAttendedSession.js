import cron from "node-cron";
import interviewSessionModel from "../models/interviewSession.model.js";

const HARD_BUFFER = Number(process.env.SESSION_HARD_BUFFER_MINUTES) || 30;
const NO_SHOW_GRACE_MINUTES = 10;

cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();

    const sessions = await interviewSessionModel
      .find({ status: { $in: ["SCHEDULED", "LIVE"] } })
      .populate("requestId", "scheduledAt");

    for (const session of sessions) {

      // Case 1: Interviewer never started
      if (session.status === "SCHEDULED" && session.requestId?.scheduledAt) {
        const end = new Date(
          new Date(session.requestId.scheduledAt).getTime() +
          session.duration * 60 * 1000 +
          NO_SHOW_GRACE_MINUTES * 60 * 1000
        );

        if (now >= end) {
          session.status = "NO_SHOW_INTERVIEWER";
          session.endedAt = now;
          await session.save();
        }
      }

      // Case 2: LIVE session auto-complete
      if (session.status === "LIVE" && session.startedAt) {
        const maxMinutes =
          session.duration + session.extendedBy + HARD_BUFFER;

        const maxEndTime = new Date(
          session.startedAt.getTime() + maxMinutes * 60 * 1000
        );

        if (now >= maxEndTime) {
          session.status = "COMPLETED";
          session.endedAt = now;
          await session.save();
        }
      }
    }

  } catch (error) {
    console.error("Session cron error:", error.message);
  }
});
