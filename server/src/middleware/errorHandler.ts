import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

/*
  Extracts a readable message and metadata from unknown thrown values,
  including plain Supabase PostgrestError objects which do not extend Error.
*/
const extractErrorInfo = (err: unknown) => {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack,
    };
  }

  if (typeof err === "object" && err !== null) {
    const record = err as Record<string, unknown>;
    return {
      message:
        typeof record.message === "string"
          ? record.message
          : JSON.stringify(err),
      code: record.code,
      details: record.details,
      hint: record.hint,
    };
  }

  return {
    message: String(err),
  };
};

// Express 4 argument error handling middleware.
// Operational errors return their specific status code and message.
// Unexpected errors log full details server side and return a safe 500 message.
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn("Operational error", {
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && env.NODE_ENV !== "production"
          ? { details: err.details }
          : {}),
      },
    });
    return;
  }

  const info = extractErrorInfo(err);

  logger.error("Unexpected error", {
    ...info,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
      ...(env.NODE_ENV !== "production" ? { details: info } : {}),
    },
  });
};
