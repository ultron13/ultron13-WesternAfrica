import type { Request, Response } from "express";
import { z } from "zod";
import { LogisticsEngine } from "../../../application/logistics/logistics-engine.js";
import { logisticsSlaRisk } from "../../../infrastructure/observability/metrics.js";

const payloadSchema = z.object({
  corridorId: z.string(),
  coldChainRequired: z.boolean(),
  stops: z.array(z.object({
    id: z.string(),
    type: z.enum(["COLLECTION", "HUB", "DELIVERY"]),
    latitude: z.number(),
    longitude: z.number(),
    windowStart: z.coerce.date(),
    windowEnd: z.coerce.date(),
    quantityKg: z.number().nonnegative()
  })),
  carriers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    capacityKg: z.number().positive(),
    refrigerated: z.boolean(),
    baseFee: z.number().nonnegative(),
    costPerKm: z.number().nonnegative()
  }))
});

const batchPayloadSchema = z.object({
  corridorId: z.string(),
  plannedDate: z.coerce.date(),
  coldChainRequired: z.boolean(),
  minimumLoadKg: z.number().positive(),
  shipments: z.array(z.object({
    shipmentId: z.string(),
    stops: payloadSchema.shape.stops
  })),
  carriers: payloadSchema.shape.carriers
});

export class LogisticsController {
  constructor(private readonly logisticsEngine = new LogisticsEngine()) {}

  plan = (request: Request, response: Response) => {
    const payload = payloadSchema.parse(request.body);
    const routePlan = this.logisticsEngine.plan(payload);
    logisticsSlaRisk.observe(routePlan.slaRiskScore);
    response.json({ routePlan });
  };

  planBatch = (request: Request, response: Response) => {
    const payload = batchPayloadSchema.parse(request.body);
    const routeBatchPlan = this.logisticsEngine.planBatch(payload);
    logisticsSlaRisk.observe(routeBatchPlan.deliveryWindowPenalty);
    response.json({ routeBatchPlan });
  };
}
