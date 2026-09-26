import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  clientId: z.string().uuid(),
});

export const createTaskSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional().default(""),
  assignedToId: z.string().uuid().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().default("MEDIUM"),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const taskFilterSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
});
