export interface LogisticsStopInput {
  id: string;
  type: "COLLECTION" | "HUB" | "DELIVERY";
  latitude: number;
  longitude: number;
  windowStart: Date;
  windowEnd: Date;
  quantityKg: number;
}

export interface CarrierOption {
  id: string;
  name: string;
  capacityKg: number;
  refrigerated: boolean;
  baseFee: number;
  costPerKm: number;
}

export interface RoutePlanInput {
  corridorId: string;
  plannedDate?: Date;
  coldChainRequired: boolean;
  stops: LogisticsStopInput[];
  carriers: CarrierOption[];
}

export interface RoutePlanResult {
  corridorId: string;
  carrierId: string;
  totalQuantityKg: number;
  estimatedDistanceKm: number;
  estimatedCost: number;
  estimatedCostPerKg: number;
  slaRiskScore: number;
  orderedStops: LogisticsStopInput[];
}

export interface RouteBatchInput {
  corridorId: string;
  plannedDate: Date;
  coldChainRequired: boolean;
  minimumLoadKg: number;
  shipments: Array<{
    shipmentId: string;
    stops: LogisticsStopInput[];
  }>;
  carriers: CarrierOption[];
}

export interface RouteBatchPlan {
  corridorId: string;
  plannedDate: Date;
  carrierId: string;
  shipmentIds: string[];
  totalQuantityKg: number;
  estimatedDistanceKm: number;
  estimatedCost: number;
  estimatedCostPerKg: number;
  deliveryWindowPenalty: number;
  orderedStops: LogisticsStopInput[];
  optimizerTrace: Record<string, unknown>;
}

export class LogisticsEngine {
  planBatch(input: RouteBatchInput): RouteBatchPlan {
    const flattenedStops = input.shipments.flatMap((shipment) => shipment.stops);
    const candidate = this.plan({
      corridorId: input.corridorId,
      plannedDate: input.plannedDate,
      coldChainRequired: input.coldChainRequired,
      stops: this.optimizeStopSequence(flattenedStops),
      carriers: input.carriers
    });

    const deliveryWindowPenalty = this.deliveryWindowPenalty(candidate.orderedStops);
    const loadPenalty = candidate.totalQuantityKg < input.minimumLoadKg
      ? (input.minimumLoadKg - candidate.totalQuantityKg) / input.minimumLoadKg
      : 0;

    return {
      corridorId: input.corridorId,
      plannedDate: input.plannedDate,
      carrierId: candidate.carrierId,
      shipmentIds: input.shipments.map((shipment) => shipment.shipmentId),
      totalQuantityKg: candidate.totalQuantityKg,
      estimatedDistanceKm: candidate.estimatedDistanceKm,
      estimatedCost: round(candidate.estimatedCost * (1 + loadPenalty), 2),
      estimatedCostPerKg: round((candidate.estimatedCost * (1 + loadPenalty)) / Math.max(candidate.totalQuantityKg, 1), 2),
      deliveryWindowPenalty: round(deliveryWindowPenalty + loadPenalty, 4),
      orderedStops: candidate.orderedStops,
      optimizerTrace: {
        optimizer: "nearest-neighbor-window-aware-v2",
        shipmentCount: input.shipments.length,
        minimumLoadKg: input.minimumLoadKg,
        loadPenalty: round(loadPenalty, 4),
        deliveryWindowPenalty: round(deliveryWindowPenalty, 4)
      }
    };
  }

  plan(input: RoutePlanInput): RoutePlanResult {
    const totalQuantityKg = input.stops
      .filter((stop) => stop.type !== "HUB")
      .reduce((sum, stop) => sum + stop.quantityKg, 0);

    const carrier = input.carriers
      .filter((candidate) => candidate.capacityKg >= totalQuantityKg)
      .filter((candidate) => !input.coldChainRequired || candidate.refrigerated)
      .sort((a, b) => (a.baseFee + a.costPerKm) - (b.baseFee + b.costPerKm))[0];

    if (!carrier) {
      throw new Error("No carrier can satisfy route capacity and cold-chain requirements.");
    }

    const orderedStops = this.optimizeStopSequence(input.stops);

    const estimatedDistanceKm = estimateRouteDistance(orderedStops);
    const estimatedCost = carrier.baseFee + estimatedDistanceKm * carrier.costPerKm;
    const earliestStart = Math.min(...orderedStops.map((stop) => stop.windowStart.getTime()));
    const latestEnd = Math.max(...orderedStops.map((stop) => stop.windowEnd.getTime()));
    const routeHours = estimatedDistanceKm / 65;
    const windowHours = (latestEnd - earliestStart) / 3_600_000;
    const slaRiskScore = clamp(routeHours / Math.max(1, windowHours), 0, 1);

    return {
      corridorId: input.corridorId,
      carrierId: carrier.id,
      totalQuantityKg,
      estimatedDistanceKm: round(estimatedDistanceKm, 2),
      estimatedCost: round(estimatedCost, 2),
      estimatedCostPerKg: round(estimatedCost / Math.max(totalQuantityKg, 1), 2),
      slaRiskScore: round(slaRiskScore, 4),
      orderedStops
    };
  }

  private optimizeStopSequence(stops: LogisticsStopInput[]): LogisticsStopInput[] {
    const collectionStops = stops.filter((stop) => stop.type === "COLLECTION").sort(byWindowStart);
    const hubStops = stops.filter((stop) => stop.type === "HUB").sort(byWindowStart);
    const deliveryStops = nearestNeighborByWindow(stops.filter((stop) => stop.type === "DELIVERY"));

    return [...collectionStops, ...hubStops, ...deliveryStops];
  }

  private deliveryWindowPenalty(stops: LogisticsStopInput[]): number {
    let elapsedHours = 0;
    let penalty = 0;

    for (let index = 1; index < stops.length; index += 1) {
      elapsedHours += haversineKm(stops[index - 1], stops[index]) / 65;
      const projectedArrival = stops[0].windowStart.getTime() + elapsedHours * 3_600_000;
      if (projectedArrival > stops[index].windowEnd.getTime()) {
        penalty += (projectedArrival - stops[index].windowEnd.getTime()) / 3_600_000;
      }
    }

    return clamp(penalty / Math.max(stops.length, 1), 0, 1);
  }
}

const byWindowStart = (a: LogisticsStopInput, b: LogisticsStopInput) => a.windowStart.getTime() - b.windowStart.getTime();
const byWindowEnd = (a: LogisticsStopInput, b: LogisticsStopInput) => a.windowEnd.getTime() - b.windowEnd.getTime();
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits: number) => Number(value.toFixed(digits));

const estimateRouteDistance = (stops: LogisticsStopInput[]) => {
  let distance = 0;
  for (let index = 1; index < stops.length; index += 1) {
    distance += haversineKm(stops[index - 1], stops[index]);
  }
  return distance;
};

const nearestNeighborByWindow = (stops: LogisticsStopInput[]): LogisticsStopInput[] => {
  const remaining = [...stops].sort(byWindowEnd);
  const ordered: LogisticsStopInput[] = [];
  let current = remaining.shift();
  if (!current) return ordered;

  ordered.push(current);
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const distance = haversineKm(current, candidate);
      const windowUrgencyHours = Math.max(1, (candidate.windowEnd.getTime() - Date.now()) / 3_600_000);
      const score = distance * 0.7 + windowUrgencyHours * 0.3;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    current = remaining.splice(bestIndex, 1)[0];
    ordered.push(current);
  }

  return ordered;
};

const haversineKm = (from: LogisticsStopInput, to: LogisticsStopInput): number => {
  const radiusKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toRad = (degrees: number) => degrees * Math.PI / 180;
