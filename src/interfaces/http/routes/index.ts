import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { MatchingController } from "../controllers/matching-controller.js";
import { LogisticsController } from "../controllers/logistics-controller.js";
import { WhatsAppController } from "../controllers/whatsapp-controller.js";
import { HandleInboundWhatsAppMessage } from "../../../application/whatsapp/handle-inbound-message.js";
import { RedisBotSessionRepository } from "../../../infrastructure/whatsapp/redis-session-repository.js";
import { LoggingWhatsAppProvider } from "../../../infrastructure/whatsapp/whatsapp-provider.js";
import { openApiDocument } from "../openapi.js";
import { register } from "../../../infrastructure/observability/metrics.js";

export const buildRouter = () => {
  const router = Router();
  const matching = new MatchingController();
  const logistics = new LogisticsController();
  const whatsappHandler = new HandleInboundWhatsAppMessage(
    new RedisBotSessionRepository(),
    new LoggingWhatsAppProvider()
  );
  const whatsapp = new WhatsAppController(whatsappHandler);

  router.get("/health", (_request, response) => response.json({ ok: true, service: "farmconnect-sa-backend" }));
  router.get("/metrics", async (_request, response) => {
    response.setHeader("Content-Type", register.contentType);
    response.send(await register.metrics());
  });
  router.get("/openapi.json", (_request, response) => response.json(openApiDocument));
  router.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  router.post("/matching/recommendations", matching.recommend);
  router.post("/aggregation/batch-plan", matching.aggregate);
  router.post("/logistics/route-plan", logistics.plan);
  router.post("/logistics/route-batch-plan", logistics.planBatch);
  router.post("/webhooks/whatsapp", whatsapp.webhook);

  return router;
};
