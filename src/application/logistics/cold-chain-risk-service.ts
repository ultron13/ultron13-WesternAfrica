export interface ColdChainRiskInput {
  productName: string;
  coldChainRequired: boolean;
  refrigerated: boolean;
  harvestDate: Date;
  projectedDeliveryAt: Date;
  maxTransitHours?: number;
  idealTransitHours?: number;
  baseSpoilageRatePerHour?: number;
  unrefrigeratedPenalty?: number;
}

export interface ColdChainRiskResult {
  transitHours: number;
  maxTransitHours: number;
  spoilageProbability: number;
  riskScore: number;
  eligible: boolean;
}

export class ColdChainRiskService {
  assess(input: ColdChainRiskInput): ColdChainRiskResult {
    const defaults = profileDefaults(input.productName);
    const maxTransitHours = input.maxTransitHours ?? defaults.maxTransitHours;
    const idealTransitHours = input.idealTransitHours ?? defaults.idealTransitHours;
    const baseSpoilageRatePerHour = input.baseSpoilageRatePerHour ?? defaults.baseSpoilageRatePerHour;
    const unrefrigeratedPenalty = input.unrefrigeratedPenalty ?? defaults.unrefrigeratedPenalty;
    const transitHours = Math.max(0, (input.projectedDeliveryAt.getTime() - input.harvestDate.getTime()) / 3_600_000);
    const excessHours = Math.max(0, transitHours - idealTransitHours);
    const coldChainPenalty = input.coldChainRequired && !input.refrigerated ? unrefrigeratedPenalty : 0;
    const spoilageProbability = clamp((excessHours * baseSpoilageRatePerHour) + coldChainPenalty, 0, 1);
    const timeRisk = clamp(transitHours / maxTransitHours, 0, 1);
    const riskScore = clamp(timeRisk * 0.55 + spoilageProbability * 0.45, 0, 1);

    return {
      transitHours: round(transitHours, 2),
      maxTransitHours,
      spoilageProbability: round(spoilageProbability, 4),
      riskScore: round(riskScore, 4),
      eligible: transitHours <= maxTransitHours && spoilageProbability < 0.35
    };
  }
}

const profileDefaults = (productName: string) => {
  if (/tomato/i.test(productName)) {
    return {
      maxTransitHours: 36,
      idealTransitHours: 18,
      baseSpoilageRatePerHour: 0.012,
      unrefrigeratedPenalty: 0.18
    };
  }

  return {
    maxTransitHours: 48,
    idealTransitHours: 24,
    baseSpoilageRatePerHour: 0.008,
    unrefrigeratedPenalty: 0.12
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits: number) => Number(value.toFixed(digits));

