import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../config/prisma";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.sub, read: false } });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.sub },
      data: { read: true },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.sub, read: false }, data: { read: true } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
