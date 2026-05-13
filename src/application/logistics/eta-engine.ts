export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface EtaStop extends GeoPoint {
  id: string;
  sequence: number;
  windowEnd: Date;
}

export interface EtaInput {
  current: GeoPoint;
  target: EtaStop;
  capturedAt: Date;
  speedKph?: number;
  defaultSpeedKph?: number;
}

export interface EtaResult {
  targetStopId: string;
  etaAt: Date;
  distanceKmRemaining: number;
  confidence: number;
  lateRisk: number;
}

export class EtaEngine {
  calculate(input: EtaInput): EtaResult {
    const distanceKmRemaining = haversineKm(input.current, input.target);
    const speedKph = Math.max(10, input.speedKph ?? input.defaultSpeedKph ?? 55);
    const hoursRemaining = distanceKmRemaining / speedKph;
    const etaAt = new Date(input.capturedAt.getTime() + hoursRemaining * 3_600_000);
    const minutesLate = Math.max(0, etaAt.getTime() - input.target.windowEnd.getTime()) / 60_000;
    const lateRisk = clamp(minutesLate / 120, 0, 1);
    const confidence = clamp(0.9 - distanceKmRemaining / 800 - lateRisk * 0.25, 0.35, 0.95);

    return {
      targetStopId: input.target.id,
      etaAt,
      distanceKmRemaining: round(distanceKmRemaining, 2),
      confidence: round(confidence, 4),
      lateRisk: round(lateRisk, 4)
    };
  }
}

const haversineKm = (from: GeoPoint, to: GeoPoint): number => {
  const radiusKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toRad = (degrees: number) => degrees * Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits: number) => Number(value.toFixed(digits));

