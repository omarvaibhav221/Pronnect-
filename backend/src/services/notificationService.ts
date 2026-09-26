import { NotificationType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { getIO } from "../sockets";

export async function createNotification(userId: string, type: NotificationType, message: string, taskId?: string) {
  const notification = await prisma.notification.create({
    data: { userId, type, message, taskId },
  });

  const unreadCount = await prisma.notification.count({ where: { userId, read: false } });

  // Pushed over the user's private socket room, not polled — the badge and
  // dropdown both update the instant the notification is created.
  getIO().to(`user:${userId}`).emit("notification:new", { notification, unreadCount });

  return notification;
}
