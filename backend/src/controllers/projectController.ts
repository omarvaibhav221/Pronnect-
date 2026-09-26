import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, clientId } = req.body;
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new ApiError(400, "CLIENT_NOT_FOUND", "Client does not exist");

    // Admin can assign the project to any PM by passing pmId; a PM creating
    // it is always the owner of their own project.
    const pmId = req.user!.role === "ADMIN" && req.body.pmId ? req.body.pmId : req.user!.sub;

    const project = await prisma.project.create({
      data: { name, clientId, pmId },
      include: { client: true, pm: { select: { id: true, name: true } } },
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user!.role;
    const userId = req.user!.sub;

    let where = {};
    if (role === "PM") {
      // A PM only ever sees projects they created — enforced here, not by
      // the frontend hiding a list.
      where = { pmId: userId };
    } else if (role === "DEVELOPER") {
      // A developer only sees projects containing at least one task assigned to them.
      where = { tasks: { some: { assignedToId: userId } } };
    }
    // ADMIN: no filter — sees everything.

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: true,
        pm: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { client: true, pm: { select: { id: true, name: true } } },
    });
    if (!project) throw new ApiError(404, "NOT_FOUND", "Project not found");

    await assertProjectAccess(req, project.id, project.pmId);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

// Shared access check reused by task routes too: this is the single source
// of truth for "can this user touch this project", called server-side on
// every relevant request — never trusted from the client.
export async function assertProjectAccess(req: Request, projectId: string, pmId?: string) {
  const role = req.user!.role;
  const userId = req.user!.sub;

  if (role === "ADMIN") return;

  if (role === "PM") {
    const owns = pmId ? pmId === userId : Boolean(await prisma.project.findFirst({ where: { id: projectId, pmId: userId } }));
    if (!owns) throw new ApiError(403, "FORBIDDEN", "You do not manage this project");
    return;
  }

  // DEVELOPER: must have at least one task assigned to them in this project.
  const hasTask = await prisma.task.findFirst({ where: { projectId, assignedToId: userId } });
  if (!hasTask) throw new ApiError(403, "FORBIDDEN", "You have no tasks on this project");
}
