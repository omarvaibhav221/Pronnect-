import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/apiError";

// All API inputs are validated here, server-side, regardless of what the
// frontend already checked — the frontend's validation is only a UX nicety.
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(400, "VALIDATION_ERROR", "Invalid request body", result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.flatten()));
    }
    // Express 5 makes req.query a getter; stash parsed values separately for handlers to use.
    (req as any).validatedQuery = result.data;
    next();
  };
}
