import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema, taskFilterSchema } from "../validators/schemas";
import { createTask, listTasks, getTask, updateTask, updateTaskStatus } from "../controllers/taskController";

const nested = Router({ mergeParams: true });
nested.use(requireAuth);
nested.post("/", validateBody(createTaskSchema), createTask);

const top = Router();
top.use(requireAuth);
top.get("/", validateQuery(taskFilterSchema), listTasks);
top.get("/:id", getTask);
top.patch("/:id", validateBody(updateTaskSchema), updateTask);
top.patch("/:id/status", validateBody(updateTaskStatusSchema), updateTaskStatus);

export default { nested, top };
