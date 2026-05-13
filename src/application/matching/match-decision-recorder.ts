import type { MatchRecommendation } from "./matching-engine.js";

export type MatchDecisionOutcome = "PENDING" | "SUCCESS" | "FAILED" | "REJECTED" | "EXPIRED";

export interface MatchDecisionRecord {
  matchingRunId?: string;
  orderId?: string;
  demandId?: string;
  listingId: string;
  score: number;
  selected: boolean;
  outcome: MatchDecisionOutcome;
  featureVector: Record<string, number>;
  modelVersion: string;
}

export interface MatchDecisionRepository {
  saveMany(records: MatchDecisionRecord[]): Promise<void>;
}

export class MatchDecisionRecorder {
  constructor(private readonly repository: MatchDecisionRepository) {}

  async recordRecommendations(input: {
    recommendations: MatchRecommendation[];
    selectedListingIds: Set<string>;
    matchingRunId?: string;
    orderId?: string;
    demandId?: string;
    modelVersion?: string;
  }): Promise<void> {
    await this.repository.saveMany(input.recommendations.map((recommendation) => ({
      matchingRunId: input.matchingRunId,
      orderId: input.orderId,
      demandId: input.demandId,
      listingId: recommendation.listingId,
      score: recommendation.score,
      selected: input.selectedListingIds.has(recommendation.listingId),
      outcome: "PENDING",
      featureVector: recommendation.explanation,
      modelVersion: input.modelVersion ?? "rules-v3"
    })));
  }
}

