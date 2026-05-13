export interface CreditDecisionInput {
  organizationId: string;
  requestedAmount: number;
  reliabilityScore: number;
  repeatOrderRate: number;
  averageMonthlyGmv: number;
  disputeRate: number;
  paymentTimelinessRate: number;
}

export interface CreditDecision {
  approved: boolean;
  limitAmount: number;
  riskScore: number;
  reasons: string[];
}

export class CreditService {
  assess(input: CreditDecisionInput): CreditDecision {
    const reasons: string[] = [];
    const revenueCapacity = input.averageMonthlyGmv * 0.35;
    const behaviorScore = input.reliabilityScore * 0.35
      + input.repeatOrderRate * 0.25
      + input.paymentTimelinessRate * 0.25
      + (1 - input.disputeRate) * 0.15;
    const riskScore = clamp(1 - behaviorScore, 0, 1);
    const limitAmount = Math.max(0, Math.min(input.requestedAmount, revenueCapacity));

    if (input.reliabilityScore < 0.65) reasons.push("Reliability score below credit threshold.");
    if (input.disputeRate > 0.12) reasons.push("Dispute rate too high.");
    if (input.averageMonthlyGmv <= 0) reasons.push("Insufficient transaction history.");
    if (limitAmount < input.requestedAmount) reasons.push("Requested amount exceeds revenue-based capacity.");

    return {
      approved: reasons.length === 0 && riskScore <= 0.35,
      limitAmount: round(limitAmount, 2),
      riskScore: round(riskScore, 4),
      reasons
    };
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits: number) => Number(value.toFixed(digits));

