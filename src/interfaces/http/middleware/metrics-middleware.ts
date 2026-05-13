import type { RequestHandler } from "express";
import { httpRequestDuration } from "../../../infrastructure/observability/metrics.js";

export const metricsMiddleware: RequestHandler = (request, response, next) => {
  const end = httpRequestDuration.startTimer();

  response.on("finish", () => {
    end({
      method: request.method,
      route: request.route?.path?.toString() ?? request.path,
      status_code: response.statusCode.toString()
    });
  });

  next();
};

