import type { Request, Response } from "express";
import { z } from "zod";
import { AggregationService } from "../../../application/aggregation/aggregation-service.js";
import { matchingScore } from "../../../infrastructure/observability/metrics.js";

const payloadSchema = z.object({
  demand: z.object({
    id: z.string(),
    buyerOrganizationId: z.string(),
    productId: z.string(),
    productName: z.string(),
    requiredQuantityKg: z.number().positive(),
    acceptedGradeCodes: z.array(z.string()),
    allowSubstitution: z.boolean(),
    maxDeliveredPricePerKg: z.number().positive(),
    deliveryLatitude: z.number(),
    deliveryLongitude: z.number(),
    deliveryWindowStart: z.coerce.date(),
    deliveryWindowEnd: z.coerce.date(),
    paymentTermsDays: z.number().int().nonnegative(),
    buyerReliabilityScore: z.number().optional()
  }),
  listings: z.array(z.object({
    id: z.string(),
    organizationId: z.string(),
    farmId: z.string().optional(),
    productId: z.string(),
    productName: z.string(),
    gradeCode: z.string(),
    quantityKg: z.number().positive(),
    reservedKg: z.number().nonnegative(),
    farmGatePricePerKg: z.number().positive(),
    harvestDate: z.coerce.date(),
    availableFrom: z.coerce.date(),
    availableUntil: z.coerce.date(),
    collectionPointId: z.string(),
    collectionLatitude: z.number(),
    collectionLongitude: z.number(),
    supplierReliabilityScore: z.number(),
    deliverySuccessRate: z.number().optional(),
    qualityAcceptanceRate: z.number().optional(),
    qualityRejectionRate: z.number().optional(),
    smallholderShare: z.number(),
    complianceApproved: z.boolean(),
    coldChainRequired: z.boolean().optional(),
    maxTransitHours: z.number().optional(),
    idealTransitHours: z.number().optional(),
    baseSpoilageRatePerHour: z.number().optional(),
    unrefrigeratedPenalty: z.number().optional(),
    status: z.enum(["DRAFT", "ACTIVE", "RESERVED", "COLLECTED", "EXHAUSTED", "SUSPENDED", "EXPIRED", "CANCELLED"])
  }))
});

export class MatchingController {
  constructor(private readonly aggregationService = new AggregationService()) {}

  recommend = (request: Request, response: Response) => {
    const payload = payloadSchema.parse(request.body);
    const recommendations = this.aggregationService.summarizeRecommendations(payload.demand, payload.listings);
    recommendations.forEach((recommendation) => matchingScore.observe(recommendation.score));
    response.json({ recommendations });
  };

  aggregate = (request: Request, response: Response) => {
    const payload = payloadSchema.parse(request.body);
    const batchPlan = this.aggregationService.plan(payload.demand, payload.listings);
    response.json({ batchPlan });
  };
}
