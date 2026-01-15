import cron from "node-cron";
import interviewSessionModel from "../models/interviewSession.model.js";

const HARD_BUFFER = Number(process.env.SESSION_HARD_BUFFER_MINUTES) || 30;
const NO_SHOW_GRACE_MINUTES = 5;

cron.schedule(
  `*/${process.env.CRON_INTERVAL_MINUTES || 5} * * * *`,
  async () => {
    try {
      const now = new Date();

      const sessions = await interviewSessionModel
        .find({
          status: { $in: ["SCHEDULED", "LIVE"] }
        })
        .populate("requestId", "scheduledAt");

      for (const session of sessions) {

        /* ---------------------------------
           CASE 1: LIVE → COMPLETED
           (Interviewer forgot to end)
        ---------------------------------- */
        if (session.status === "LIVE" && session.startedAt) {
          const maxAllowedMinutes =
            session.duration + session.extendedBy + HARD_BUFFER;

          const maxEndTime = new Date(
            session.startedAt.getTime() +
            maxAllowedMinutes * 60 * 1000
          );

          if (now >= maxEndTime) {
            session.status = "COMPLETED";
            session.endedAt = now;
            await session.save();
          }

          continue; // IMPORTANT: do not fall through
        }

        /* ---------------------------------
           CASE 2: SCHEDULED → NO_SHOW_INTERVIEWER
           (Interviewer never started)
        ---------------------------------- */
        if (
          session.status === "SCHEDULED" &&
          session.requestId?.scheduledAt
        ) {
          const scheduledStart = new Date(session.requestId.scheduledAt);

          const scheduledEnd = new Date(
            scheduledStart.getTime() +
            session.duration * 60 * 1000
          );

          const noShowCutoff = new Date(
            scheduledEnd.getTime() +
            NO_SHOW_GRACE_MINUTES * 60 * 1000
          );

          if (now >= noShowCutoff) {
            session.status = "NO_SHOW_INTERVIEWER";
            session.endedAt = now;
            await session.save();
          }
        }
      }
    } catch (error) {
      console.error("Cron session lifecycle failed:", error.message);
    }
  }
);
