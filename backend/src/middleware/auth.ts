import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken, AccessTokenPayload } from "../utils/jwt";
import { ApiError } from "../utils/apiError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// Requires a valid, unexpired access token on every protected route.
// The access token is short-lived (15m) precisely so that a compromised
// token has a small blast radius; the refresh token (httpOnly cookie,
// never readable by JS) is what re-issues it.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return next(new ApiError(401, "AUTH_REQUIRED", "Missing access token"));

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new ApiError(401, "AUTH_INVALID", "Access token invalid or expired"));
  }
}

// Whitelist-based role gate. This is deliberately re-checked on every route
// that needs it (not just inferred from a UI state) — a Developer presenting
// a still-valid token can never pass a PM/Admin-only route, regardless of
// what the frontend would have shown them.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, "AUTH_REQUIRED", "Missing access token"));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "FORBIDDEN", "You do not have access to this resource"));
    }
    next();
  };
}
