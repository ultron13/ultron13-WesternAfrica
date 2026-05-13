import type { PrismaClient } from "@prisma/client";
import type { GpsPingInput, GpsTrackingRepository } from "../../application/logistics/gps-tracking-service.js";
import { prisma } from "../prisma/client.js";

export class PrismaGpsTrackingRepository implements GpsTrackingRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async savePing(input: GpsPingInput): Promise<void> {
    await this.db.gpsPing.create({
      data: {
        shipmentId: input.shipmentId,
        latitude: input.latitude,
        longitude: input.longitude,
        speedKph: input.speedKph,
        headingDegrees: input.headingDegrees,
        accuracyMeters: input.accuracyMeters,
        batteryPercent: input.batteryPercent,
        capturedAt: input.capturedAt
      }
    });
  }

  async saveEta(input: {
    shipmentId: string;
    targetStopId: string;
    etaAt: Date;
    distanceKmRemaining: number;
    confidence: number;
  }): Promise<void> {
    await this.db.etaSnapshot.create({
      data: {
        shipmentId: input.shipmentId,
        targetStopId: input.targetStopId,
        etaAt: input.etaAt,
        distanceKmRemaining: input.distanceKmRemaining,
        confidence: input.confidence
      }
    });
  }
}

