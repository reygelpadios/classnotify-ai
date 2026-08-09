import { NextFunction, Request, Response } from "express";
import { verifyJwt } from "@utils/jwt";
import { AppError } from "./errorHandler";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;

  if (!token) {
    return next(new AppError("Not authenticated", 401));
  }

  try {
    const payload = verifyJwt(token);
    req.userId = payload.userId;
    next();
  } catch {
    next(new AppError("Invalid or expired session", 401));
  }
}
