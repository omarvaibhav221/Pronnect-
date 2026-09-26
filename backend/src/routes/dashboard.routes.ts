import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { getOnlineCount } from "../sockets";

const router = Router();
router.use(requireAuth);

router.get("/admin", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const [totalProjects, totalTasks, byStatus, overdueCount] = await Promise.all([
      prisma.project.count(),
      prisma.task.count(),
      prisma.task.groupBy({ by: ["status"], _count: true }),
      prisma.task.count({ where: { isOverdue: true } }),
    ]);
    res.json({
      totalProjects,
      totalTasks,
      tasksByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      overdueCount,
      onlineNow: getOnlineCount(),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/pm", requireRole("PM"), async (req, res, next) => {
  try {
    const pmId = req.user!.sub;
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const [projects, byPriority, dueThisWeek] = await Promise.all([
      prisma.project.findMany({ where: { pmId }, include: { _count: { select: { tasks: true } } } }),
      prisma.task.groupBy({ by: ["priority"], where: { project: { pmId } }, _count: true }),
      prisma.task.findMany({
        where: { project: { pmId }, dueDate: { lte: weekFromNow, gte: new Date() } },
        include: { assignedTo: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    res.json({
      projects,
      tasksByPriority: Object.fromEntries(byPriority.map((p) => [p.priority, p._count])),
      dueThisWeek,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/developer", requireRole("DEVELOPER"), async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedToId: req.user!.sub, status: { not: "DONE" } },
      include: { project: { select: { name: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

export default router;
