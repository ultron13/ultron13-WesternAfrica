export interface ReliabilitySignalInput {
  type:
    | "ON_TIME_DELIVERY"
    | "LATE_DELIVERY"
    | "QUALITY_ACCEPTED"
    | "QUALITY_REJECTED"
    | "ORDER_CANCELLED"
    | "PAYMENT_ON_TIME"
    | "PAYMENT_LATE"
    | "DISPUTE_OPENED"
    | "DISPUTE_RESOLVED"
    | "COLLECTION_NO_SHOW";
  weight?: number;
}

export interface ReliabilityScorecard {
  score: number;
  deliverySuccessRate: number;
  qualityAcceptanceRate: number;
  paymentTimelinessRate: number;
  cancellationRate: number;
  disputeRate: number;
  sampleSize: number;
}

export class ReliabilityEngine {
  calculate(signals: ReliabilitySignalInput[]): ReliabilityScorecard {
    const sampleSize = signals.length;
    if (sampleSize === 0) {
      return {
        score: 0.75,
        deliverySuccessRate: 0.75,
        qualityAcceptanceRate: 0.75,
        paymentTimelinessRate: 0.75,
        cancellationRate: 0,
        disputeRate: 0,
        sampleSize
      };
    }

    const count = (types: ReliabilitySignalInput["type"][]) => signals.filter((signal) => types.includes(signal.type)).length;
    const deliveryTotal = count(["ON_TIME_DELIVERY", "LATE_DELIVERY", "COLLECTION_NO_SHOW"]);
    const qualityTotal = count(["QUALITY_ACCEPTED", "QUALITY_REJECTED"]);
    const paymentTotal = count(["PAYMENT_ON_TIME", "PAYMENT_LATE"]);

    const deliverySuccessRate = ratio(count(["ON_TIME_DELIVERY"]), deliveryTotal);
    const qualityAcceptanceRate = ratio(count(["QUALITY_ACCEPTED"]), qualityTotal);
    const paymentTimelinessRate = ratio(count(["PAYMENT_ON_TIME"]), paymentTotal);
    const cancellationRate = ratio(count(["ORDER_CANCELLED", "COLLECTION_NO_SHOW"]), sampleSize);
    const disputeRate = ratio(count(["DISPUTE_OPENED"]), sampleSize);

    const score = deliverySuccessRate * 0.30
      + qualityAcceptanceRate * 0.30
      + paymentTimelinessRate * 0.16
      + (1 - cancellationRate) * 0.14
      + (1 - disputeRate) * 0.10;

    return {
      score: round(score, 4),
      deliverySuccessRate: round(deliverySuccessRate, 4),
      qualityAcceptanceRate: round(qualityAcceptanceRate, 4),
      paymentTimelinessRate: round(paymentTimelinessRate, 4),
      cancellationRate: round(cancellationRate, 4),
      disputeRate: round(disputeRate, 4),
      sampleSize
    };
  }
}

const ratio = (numerator: number, denominator: number) => denominator === 0 ? 0.75 : numerator / denominator;
const round = (value: number, digits: number) => Number(value.toFixed(digits));

