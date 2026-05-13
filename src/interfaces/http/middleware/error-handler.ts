import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "ValidationError", issues: error.issues });
    return;
  }

  response.status(500).json({
    error: "InternalServerError",
    message: error instanceof Error ? error.message : "Unexpected error"
  });
};

