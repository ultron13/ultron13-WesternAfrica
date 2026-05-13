import type { PrismaClient } from "@prisma/client";
import type { MatchDecisionRecord, MatchDecisionRepository } from "../../application/matching/match-decision-recorder.js";
import { prisma } from "../prisma/client.js";

export class PrismaMatchDecisionRepository implements MatchDecisionRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async saveMany(records: MatchDecisionRecord[]): Promise<void> {
    if (records.length === 0) return;

    await this.db.matchDecision.createMany({
      data: records.map((record) => ({
        matchingRunId: record.matchingRunId,
        orderId: record.orderId,
        demandId: record.demandId,
        listingId: record.listingId,
        score: record.score,
        selected: record.selected,
        outcome: record.outcome,
        featureVector: record.featureVector,
        modelVersion: record.modelVersion
      }))
    });
  }
}

