import { NextFunction, Request, Response } from "express";
import { logger } from "@utils/logger";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Unexpected error";

  logger.error(message, { path: req.path, method: req.method, stack: (err as Error)?.stack });

  res.status(statusCode).json({
    error: {
      message: statusCode === 500 ? "Internal server error" : message,
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}` } });
}
