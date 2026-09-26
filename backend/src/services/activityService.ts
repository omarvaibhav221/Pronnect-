import { TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { getIO } from "../sockets";

interface RecordActivityInput {
  taskId: string;
  projectId: string;
  userId: string;
  fromStatus?: TaskStatus | null;
  toStatus: TaskStatus;
  message: string;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export async function recordActivity(input: RecordActivityInput) {
  const log = await prisma.activityLog.create({
    data: {
      taskId: input.taskId,
      projectId: input.projectId,
      userId: input.userId,
      fromStatus: input.fromStatus ?? undefined,
      toStatus: input.toStatus,
      message: input.message,
    },
    include: { user: { select: { id: true, name: true } }, task: { select: { title: true, assignedToId: true } } },
  });

  const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { pmId: true } });

  const payload = {
    id: log.id,
    taskId: log.taskId,
    taskTitle: log.task.title,
    projectId: log.projectId,
    userId: log.userId,
    userName: log.user.name,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    message: log.message,
    createdAt: log.createdAt,
  };

  const io = getIO();
  // Anyone currently viewing this project sees the update live, regardless of role.
  io.to(`project:${input.projectId}`).emit("activity:new", payload);
  // Admin's global feed sees every event across every project.
  io.to("feed:admin").emit("activity:new", payload);
  // The owning PM's feed sees only events from projects they created.
  if (project?.pmId) io.to(`feed:pm:${project.pmId}`).emit("activity:new", payload);
  // The assigned developer's feed sees only events on their own tasks.
  if (log.task.assignedToId) io.to(`user:${log.task.assignedToId}`).emit("activity:new", payload);

  return payload;
}

export function statusLabel(status: TaskStatus): string {
  return STATUS_LABEL[status];
}
