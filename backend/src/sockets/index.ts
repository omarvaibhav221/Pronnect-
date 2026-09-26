import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken, AccessTokenPayload } from "../utils/jwt";
import { env } from "../config/env";
import { prisma } from "../config/prisma";

let io: Server | undefined;

// userId -> set of live socket ids. A user can have multiple tabs/devices
// open; "online" means at least one socket is connected.
const onlineUsers = new Map<string, Set<string>>();

export function getIO(): Server {
  if (!io) throw new Error("Socket.io server not initialized yet");
  return io;
}

function broadcastPresence() {
  getIO().to("feed:admin").emit("presence:count", { onlineCount: onlineUsers.size });
}

export function initSockets(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  // Socket.io chosen over raw WebSocket / SSE: we need per-project rooms,
  // per-role broadcast rooms, and automatic reconnection with room rejoin,
  // all of which socket.io gives us natively. Raw WebSocket would mean
  // hand-rolling a room/pub-sub layer for no real benefit at this scale;
  // SSE is one-directional and can't carry presence pings from the client.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("AUTH_REQUIRED"));
      const payload = verifyAccessToken(token);
      (socket.data as { user: AccessTokenPayload }).user = payload;
      next();
    } catch {
      next(new Error("AUTH_INVALID"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket.data as { user: AccessTokenPayload }).user;

    // Every user gets a private room for notifications and (for developers)
    // task-scoped activity.
    socket.join(`user:${user.sub}`);

    if (user.role === "ADMIN") {
      socket.join("feed:admin");
    }
    if (user.role === "PM") {
      socket.join(`feed:pm:${user.sub}`);
    }

    if (!onlineUsers.has(user.sub)) onlineUsers.set(user.sub, new Set());
    onlineUsers.get(user.sub)!.add(socket.id);
    broadcastPresence();

    // Client asks to watch a specific project (e.g. opened its detail page).
    // Server re-checks access before allowing the join — a Developer or PM
    // cannot subscribe to a project's room just by knowing its id.
    socket.on("project:watch", async (projectId: string, ack?: (ok: boolean) => void) => {
      const allowed = await canAccessProject(user, projectId);
      if (!allowed) return ack?.(false);
      socket.join(`project:${projectId}`);
      ack?.(true);
    });

    socket.on("project:unwatch", (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // Missed-event catchup: on (re)connect the client requests the last 20
    // events for whatever scope it's viewing. Always read from the database
    // — nothing is served from an in-memory buffer, so a fresh server
    // instance or a user who was offline for hours still gets correct data.
    socket.on("activity:catchup", async (scope: { projectId?: string }, cb: (events: unknown[]) => void) => {
      const events = await fetchCatchupEvents(user, scope?.projectId);
      cb(events);
    });

    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(user.sub);
      sockets?.delete(socket.id);
      if (sockets && sockets.size === 0) onlineUsers.delete(user.sub);
      broadcastPresence();
    });
  });

  return io;
}

async function canAccessProject(user: AccessTokenPayload, projectId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return false;
  if (user.role === "PM") return project.pmId === user.sub;
  // Developer: allowed to watch a project only if they have a task in it.
  const task = await prisma.task.findFirst({ where: { projectId, assignedToId: user.sub } });
  return Boolean(task);
}

async function fetchCatchupEvents(user: AccessTokenPayload, projectId?: string) {
  if (user.role === "ADMIN") {
    return prisma.activityLog.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } }, task: { select: { title: true } } },
    });
  }
  if (user.role === "PM") {
    return prisma.activityLog.findMany({
      where: { project: { pmId: user.sub }, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } }, task: { select: { title: true } } },
    });
  }
  // Developer: only events on tasks assigned to them.
  return prisma.activityLog.findMany({
    where: { task: { assignedToId: user.sub }, ...(projectId ? { projectId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true } }, task: { select: { title: true } } },
  });
}

export function getOnlineCount(): number {
  return onlineUsers.size;
}
