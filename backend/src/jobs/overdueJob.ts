import cron from "node-cron";
import { prisma } from "../config/prisma";
import { createNotification } from "../services/notificationService";

// node-cron chosen over Bull: this job has no need for a distributed queue,
// retries, or persistence across restarts — it's a single idempotent sweep
// over the database on a schedule. Bull would add a Redis dependency for a
// job that a plain in-process cron handles fully. If this were split across
// multiple backend instances, Bull (or a Postgres advisory lock around the
// cron tick) would be the right upgrade to avoid double-processing.
export function startOverdueJob() {
  // Runs every 5 minutes.
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    const newlyOverdue = await prisma.task.findMany({
      where: { dueDate: { lt: now }, isOverdue: false, status: { not: "DONE" } },
      include: { project: true },
    });

    if (newlyOverdue.length === 0) return;

    await prisma.task.updateMany({
      where: { id: { in: newlyOverdue.map((t) => t.id) } },
      data: { isOverdue: true },
    });

    for (const task of newlyOverdue) {
      if (task.assignedToId) {
        await createNotification(task.assignedToId, "TASK_OVERDUE", `"${task.title}" is now overdue`, task.id);
      }
      await createNotification(task.project.pmId, "TASK_OVERDUE", `"${task.title}" is now overdue`, task.id);
    }

    // eslint-disable-next-line no-console
    console.log(`[overdue-job] flagged ${newlyOverdue.length} task(s) as overdue`);
  });
}
