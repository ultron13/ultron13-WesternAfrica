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
    private readonly etaEngine = new EtaEngine()
  ) {}

  async ingest(input: GpsPingInput, nextStop?: EtaStop) {
    await this.repository.savePing(input);
    if (!nextStop) return null;

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

    return eta;
  }
}

