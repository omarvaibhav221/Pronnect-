import { Router } from "express";
import { login, refresh, logout, me } from "../controllers/authController";
import { validateBody } from "../middleware/validate";
import { loginSchema } from "../validators/schemas";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
