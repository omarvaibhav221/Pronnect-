import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { assertProjectAccess } from "./projectController";
import { recordActivity, statusLabel } from "../services/activityService";
import { createNotification } from "../services/notificationService";

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new ApiError(404, "NOT_FOUND", "Project not found");
    await assertProjectAccess(req, projectId, project.pmId);
    if (req.user!.role === "DEVELOPER") throw new ApiError(403, "FORBIDDEN", "Developers cannot create tasks");

    const { title, description, assignedToId, priority, dueDate } = req.body;

    if (assignedToId) {
      const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!assignee || assignee.role !== "DEVELOPER") {
        throw new ApiError(400, "INVALID_ASSIGNEE", "Tasks can only be assigned to developers");
      }
    }

    const task = await prisma.task.create({
      data: { projectId, title, description, assignedToId, priority, dueDate: dueDate ? new Date(dueDate) : null },
    });

    if (assignedToId) {
      await createNotification(assignedToId, "TASK_ASSIGNED", `You were assigned "${task.title}"`, task.id);
    }

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

// Filters (status, priority, due-date range, project) come from validated
// query params, so the resulting list is always a shareable URL.
export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req as any).validatedQuery as {
      status?: string; priority?: string; dueBefore?: string; dueAfter?: string;
      projectId?: string; page: number; pageSize: number;
    };
    const role = req.user!.role;
    const userId = req.user!.sub;

    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.projectId) where.projectId = q.projectId;
    if (q.dueBefore || q.dueAfter) {
      where.dueDate = {};
      if (q.dueBefore) where.dueDate.lte = new Date(q.dueBefore);
      if (q.dueAfter) where.dueDate.gte = new Date(q.dueAfter);
    }

    // Role scoping happens here, server-side, independent of any filter the
    // client passed — a Developer cannot widen `where` to see others' tasks
    // by omitting a filter, and cannot see a PM's other-project tasks either.
    if (role === "DEVELOPER") {
      where.assignedToId = userId;
    } else if (role === "PM") {
      where.project = { pmId: userId };
    }

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: { assignedTo: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({ items, total, page: q.page, pageSize: q.pageSize });
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        assignedTo: { select: { id: true, name: true } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
      },
    });
    if (!task) throw new ApiError(404, "NOT_FOUND", "Task not found");

    // A developer hitting /tasks/:id directly for a task not assigned to
    // them is rejected here, regardless of what the UI would have shown.
    if (req.user!.role === "DEVELOPER" && task.assignedToId !== req.user!.sub) {
      throw new ApiError(403, "FORBIDDEN", "This task is not assigned to you");
    }
    if (req.user!.role === "PM" && task.project.pmId !== req.user!.sub) {
      throw new ApiError(403, "FORBIDDEN", "You do not manage this project");
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id }, include: { project: true } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Task not found");
    if (req.user!.role === "DEVELOPER") throw new ApiError(403, "FORBIDDEN", "Developers cannot edit task details");
    await assertProjectAccess(req, existing.projectId, existing.project.pmId);

    const { title, description, assignedToId, priority, dueDate } = req.body;
    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
    });

    if (assignedToId && assignedToId !== existing.assignedToId) {
      await createNotification(assignedToId, "TASK_ASSIGNED", `You were assigned "${task.title}"`, task.id);
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function updateTaskStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id }, include: { project: true } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Task not found");

    // A developer may only move the status of a task assigned to them.
    if (req.user!.role === "DEVELOPER" && existing.assignedToId !== req.user!.sub) {
      throw new ApiError(403, "FORBIDDEN", "This task is not assigned to you");
    }
    if (req.user!.role === "PM" && existing.project.pmId !== req.user!.sub) {
      throw new ApiError(403, "FORBIDDEN", "You do not manage this project");
    }

    const { status } = req.body;
    const task = await prisma.task.update({
      where: { id: existing.id },
      data: { status, isOverdue: status === "DONE" ? false : existing.isOverdue },
    });

    const actor = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    await recordActivity({
      taskId: task.id,
      projectId: task.projectId,
      userId: req.user!.sub,
      fromStatus: existing.status,
      toStatus: task.status,
      message: `${actor!.name} moved "${task.title}" from ${statusLabel(existing.status)} \u2192 ${statusLabel(task.status)}`,
    });

    // PM is notified when a task on their project moves into review.
    if (task.status === "IN_REVIEW" && existing.status !== "IN_REVIEW") {
      await createNotification(existing.project.pmId, "TASK_IN_REVIEW", `"${task.title}" was moved to In Review`, task.id);
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
}
