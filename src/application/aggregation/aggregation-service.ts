import type { BuyerDemandLine } from "../../domain/demand/types.js";
import type { ProduceListingSnapshot } from "../../domain/supply/types.js";
import { MatchingEngine, type MatchRecommendation } from "../matching/matching-engine.js";

export interface AggregationBatchPlan {
  demandLineId: string;
  totalQuantityKg: number;
  fillRate: number;
  supplierCount: number;
  weightedScore: number;
  lines: AggregationBatchPlanLine[];
  warnings: string[];
}

export interface AggregationBatchPlanLine {
  listingId: string;
  reservedQuantityKg: number;
  score: number;
  expectedDeliveredPricePerKg: number;
}

export class AggregationService {
  constructor(
    private readonly matchingEngine = new MatchingEngine(),
    private readonly maxSuppliersPerBatch = 5
  ) {}

  plan(demand: BuyerDemandLine, listings: ProduceListingSnapshot[]): AggregationBatchPlan {
    const recommendations = this.matchingEngine.recommend(demand, listings);
    const selected: Array<AggregationBatchPlanLine & { weightedQuantityScore: number }> = [];
    let remainingKg = demand.requiredQuantityKg;

    for (const recommendation of recommendations) {
      if (remainingKg <= 0 || selected.length >= this.maxSuppliersPerBatch) break;
      const reservedQuantityKg = Math.min(recommendation.quantityAvailableKg, remainingKg);
      selected.push({
        listingId: recommendation.listingId,
        reservedQuantityKg,
        score: recommendation.score,
        expectedDeliveredPricePerKg: recommendation.expectedDeliveredPricePerKg,
        weightedQuantityScore: reservedQuantityKg * recommendation.score
      });
      remainingKg -= reservedQuantityKg;
    }

    const totalQuantityKg = selected.reduce((sum, line) => sum + line.reservedQuantityKg, 0);
    const weightedScore = totalQuantityKg === 0
      ? 0
      : selected.reduce((sum, line) => sum + line.weightedQuantityScore, 0) / totalQuantityKg;

    const supplierPenalty = Math.max(0, selected.length - 1) * 0.025;
    const warnings: string[] = [];
    if (totalQuantityKg < demand.requiredQuantityKg) warnings.push("Batch does not fully satisfy requested quantity.");
    if (selected.length === this.maxSuppliersPerBatch && remainingKg > 0) warnings.push("Supplier cap reached before demand was filled.");

    return {
      demandLineId: demand.id,
      totalQuantityKg,
      fillRate: round(totalQuantityKg / demand.requiredQuantityKg, 4),
      supplierCount: selected.length,
      weightedScore: round(Math.max(0, weightedScore - supplierPenalty), 4),
      lines: selected.map(({ weightedQuantityScore, ...line }) => line),
      warnings
    };
  }

  summarizeRecommendations(demand: BuyerDemandLine, listings: ProduceListingSnapshot[]): MatchRecommendation[] {
    return this.matchingEngine.recommend(demand, listings);
  }
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));

