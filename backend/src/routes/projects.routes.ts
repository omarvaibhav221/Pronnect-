import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createProjectSchema } from "../validators/schemas";
import { createProject, listProjects, getProject } from "../controllers/projectController";
import taskRoutes from "./tasks.routes";

const router = Router();

router.use(requireAuth);

router.get("/", listProjects);
router.post("/", requireRole("ADMIN", "PM"), validateBody(createProjectSchema), createProject);
router.get("/:id", getProject);

// Nested task routes: POST /projects/:projectId/tasks
router.use("/:projectId/tasks", taskRoutes.nested);

export default router;
