import { EtaEngine, type EtaStop } from "./eta-engine.js";

export interface GpsPingInput {
  shipmentId: string;
  latitude: number;
  longitude: number;
  speedKph?: number;
  headingDegrees?: number;
  accuracyMeters?: number;
  batteryPercent?: number;
  capturedAt: Date;
}

export interface GpsTrackingRepository {
  savePing(input: GpsPingInput): Promise<void>;
  saveEta(input: {
    shipmentId: string;
    targetStopId: string;
    etaAt: Date;
    distanceKmRemaining: number;
    confidence: number;
  }): Promise<void>;
}

import { EtaEngine, type EtaStop } from "./eta-engine.js";

export interface GpsPingInput {
  shipmentId: string;
  latitude: number;
  longitude: number;
  speedKph?: number;
  headingDegrees?: number;
  accuracyMeters?: number;
  batteryPercent?: number;
  capturedAt: Date;
}

export interface GpsTrackingRepository {
  savePing(input: GpsPingInput): Promise<void>;
  saveEta(input: {
    shipmentId: string;
    targetStopId: string;
    etaAt: Date;
    distanceKmRemaining: number;
    confidence: number;
  }): Promise<void>;
}

export class GpsTrackingService {
  constructor(
    private readonly repository: GpsTrackingRepository,
    private readonly etaEngine = new EtaEngine(),
    private readonly trackingIo?: any // Socket.IO namespace
  ) {}

  async ingest(input: GpsPingInput, nextStop?: EtaStop) {
    await this.repository.savePing(input);

    const update = {
      shipmentId: input.shipmentId,
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
        speedKph: input.speedKph,
        headingDegrees: input.headingDegrees,
        accuracyMeters: input.accuracyMeters,
        batteryPercent: input.batteryPercent
      },
      capturedAt: input.capturedAt
    };

    if (nextStop) {
      const eta = this.etaEngine.calculate({
        current: { latitude: input.latitude, longitude: input.longitude },
        target: nextStop,
        speedKph: input.speedKph,
        capturedAt: input.capturedAt
      });

      await this.repository.saveEta({
        shipmentId: input.shipmentId,
        targetStopId: eta.targetStopId,
        etaAt: eta.etaAt,
        distanceKmRemaining: eta.distanceKmRemaining,
        confidence: eta.confidence
      });

      update.eta = eta;
    }

    // Emit real-time update
    if (this.trackingIo) {
      this.trackingIo.to(`shipment-${input.shipmentId}`).emit("location-update", update);
    }

    return update;
  }
}

