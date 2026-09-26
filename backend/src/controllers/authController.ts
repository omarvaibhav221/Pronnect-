import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { signAccessToken, generateRefreshToken, refreshTokenExpiry } from "../utils/jwt";
import { env } from "../config/env";

const REFRESH_COOKIE = "refreshToken";

function setRefreshCookie(res: Response, token: string, expires: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true, // never readable by client JS — mitigates XSS token theft
    secure: env.cookieSecure, // true in production (HTTPS only)
    sameSite: "lax",
    expires,
    path: "/api/auth", // only sent to auth endpoints
  });
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const refreshToken = generateRefreshToken();
    const expiresAt = refreshTokenExpiry();

    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });
    setRefreshCookie(res, refreshToken, expiresAt);

    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw new ApiError(401, "NO_REFRESH_TOKEN", "No refresh token provided");

    const stored = await prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new ApiError(401, "REFRESH_INVALID", "Refresh token invalid or expired");
    }

    // Rotate: revoke the used token and issue a new one. Limits the window
    // in which a stolen refresh token remains usable, and lets us detect
    // reuse of an already-rotated token as a signal of theft.
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const newRefreshToken = generateRefreshToken();
    const expiresAt = refreshTokenExpiry();
    await prisma.refreshToken.create({ data: { token: newRefreshToken, userId: stored.userId, expiresAt } });
    setRefreshCookie(res, newRefreshToken, expiresAt);

    const accessToken = signAccessToken({ sub: stored.user.id, role: stored.user.role, email: stored.user.email });

    res.json({
      accessToken,
      user: { id: stored.user.id, name: stored.user.name, email: stored.user.email, role: stored.user.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) {
      await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
    }
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
}
