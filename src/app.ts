import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { buildRouter } from "./interfaces/http/routes/index.js";
import { errorHandler } from "./interfaces/http/middleware/error-handler.js";
import { metricsMiddleware } from "./interfaces/http/middleware/metrics-middleware.js";
import { logger } from "./infrastructure/logging/logger.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(pinoHttp({ logger }));
  app.use(metricsMiddleware);
  app.use("/api/v1", buildRouter());
  app.use(errorHandler);

  return app;
};
