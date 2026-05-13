import type { BuyerDemandLine } from "../../domain/demand/types.js";
import type { ProduceListingSnapshot } from "../../domain/supply/types.js";
import { ColdChainRiskService } from "../logistics/cold-chain-risk-service.js";

export interface MatchRecommendation {
  listingId: string;
  demandLineId: string;
  score: number;
  quantityAvailableKg: number;
  expectedDeliveredPricePerKg: number;
  expectedGrossMarginPerKg: number;
  estimatedDistanceKm: number;
  spoilageProbability: number;
  explanation: Record<string, number>;
}

export interface MatchingConfig {
  targetMarginPerKg: number;
  logisticsBaseCostPerKg: number;
  qualityCostPerKg: number;
  shrinkageBufferPerKg: number;
  maxCollectionDistanceKm: number;
  refrigeratedTransportDefault: boolean;
}

const defaultConfig: MatchingConfig = {
  targetMarginPerKg: 1.55,
  logisticsBaseCostPerKg: 4.5,
  qualityCostPerKg: 0.45,
  shrinkageBufferPerKg: 4,
  maxCollectionDistanceKm: 650,
  refrigeratedTransportDefault: true
};

export class MatchingEngine {
  constructor(
    private readonly config: MatchingConfig = defaultConfig,
    private readonly coldChainRisk = new ColdChainRiskService()
  ) {}

  recommend(demand: BuyerDemandLine, listings: ProduceListingSnapshot[]): MatchRecommendation[] {
    return listings
      .filter((listing) => this.isEligible(demand, listing))
      .map((listing) => this.score(demand, listing))
      .filter((recommendation) => recommendation.expectedDeliveredPricePerKg <= demand.maxDeliveredPricePerKg)
      .sort((a, b) => b.score - a.score);
  }

  private isEligible(demand: BuyerDemandLine, listing: ProduceListingSnapshot): boolean {
    const availableKg = listing.quantityKg - listing.reservedKg;
    const gradeAccepted = demand.acceptedGradeCodes.includes(listing.gradeCode) || demand.allowSubstitution;

    return listing.status === "ACTIVE"
      && listing.productId === demand.productId
      && availableKg > 0
      && gradeAccepted
      && listing.complianceApproved
      && listing.availableFrom <= demand.deliveryWindowEnd
      && listing.availableUntil >= demand.deliveryWindowStart;
  }

  private score(demand: BuyerDemandLine, listing: ProduceListingSnapshot): MatchRecommendation {
    const availableKg = listing.quantityKg - listing.reservedKg;
    const distanceKm = distanceBetween(demand, listing);
    const logisticsCostPerKg = this.estimateLogisticsCostPerKg(distanceKm);
    const coldChain = this.coldChainRisk.assess({
      productName: listing.productName,
      coldChainRequired: listing.coldChainRequired ?? true,
      refrigerated: this.config.refrigeratedTransportDefault,
      harvestDate: listing.harvestDate,
      projectedDeliveryAt: demand.deliveryWindowStart,
      maxTransitHours: listing.maxTransitHours,
      idealTransitHours: listing.idealTransitHours,
      baseSpoilageRatePerHour: listing.baseSpoilageRatePerHour,
      unrefrigeratedPenalty: listing.unrefrigeratedPenalty
    });
    const expectedDeliveredPricePerKg = listing.farmGatePricePerKg
      + logisticsCostPerKg
      + this.config.qualityCostPerKg
      + this.config.shrinkageBufferPerKg
      + this.config.targetMarginPerKg;

    const priceScore = clamp(1 - expectedDeliveredPricePerKg / demand.maxDeliveredPricePerKg, 0, 1);
    const gradeScore = demand.acceptedGradeCodes.includes(listing.gradeCode) ? 1 : 0.72;
    const freshnessScore = this.freshnessScore(listing.harvestDate, demand.deliveryWindowStart);
    const proximityScore = clamp(1 - distanceKm / this.config.maxCollectionDistanceKm, 0, 1);
    const logisticsScore = clamp((1 - logisticsCostPerKg / (this.config.logisticsBaseCostPerKg * 2)) * (1 - coldChain.riskScore), 0, 1);
    const reliabilityScore = this.reliabilityScore(listing);
    const buyerScore = clamp(demand.buyerReliabilityScore ?? 0.75, 0, 1);
    const availabilityScore = clamp(availableKg / demand.requiredQuantityKg, 0, 1);
    const impactScore = clamp(listing.smallholderShare, 0, 1);
    const spoilageScore = clamp(1 - coldChain.spoilageProbability, 0, 1);
    const marginScore = clamp(this.config.targetMarginPerKg / Math.max(1, expectedDeliveredPricePerKg), 0, 1);

    const total = priceScore * 0.18
      + proximityScore * 0.12
      + gradeScore * 0.12
      + freshnessScore * 0.13
      + logisticsScore * 0.12
      + reliabilityScore * 0.14
      + buyerScore * 0.04
      + availabilityScore * 0.07
      + spoilageScore * 0.05
      + impactScore * 0.02
      + marginScore * 0.01;

    return {
      listingId: listing.id,
      demandLineId: demand.id,
      score: round(total, 4),
      quantityAvailableKg: availableKg,
      expectedDeliveredPricePerKg: round(expectedDeliveredPricePerKg, 2),
      expectedGrossMarginPerKg: this.config.targetMarginPerKg,
      estimatedDistanceKm: round(distanceKm, 2),
      spoilageProbability: coldChain.spoilageProbability,
      explanation: {
        priceScore: round(priceScore, 4),
        proximityScore: round(proximityScore, 4),
        gradeScore,
        freshnessScore: round(freshnessScore, 4),
        logisticsScore: round(logisticsScore, 4),
        reliabilityScore: round(reliabilityScore, 4),
        buyerScore,
        availabilityScore: round(availabilityScore, 4),
        spoilageScore: round(spoilageScore, 4),
        spoilageProbability: coldChain.spoilageProbability,
        coldChainRiskScore: coldChain.riskScore,
        marginScore: round(marginScore, 4),
        impactScore,
        deliverySuccessRate: listing.deliverySuccessRate ?? 0.75,
        qualityAcceptanceRate: listing.qualityAcceptanceRate ?? 0.75
      }
    };
  }

  private estimateLogisticsCostPerKg(distanceKm: number): number {
    const distanceFactor = clamp(distanceKm / this.config.maxCollectionDistanceKm, 0.75, 1.45);
    return round(this.config.logisticsBaseCostPerKg * distanceFactor, 2);
  }

  private freshnessScore(harvestDate: Date, deliveryDate: Date): number {
    const days = Math.max(0, (deliveryDate.getTime() - harvestDate.getTime()) / 86_400_000);
    return clamp(1 - days / 7, 0.2, 1);
  }

  private reliabilityScore(listing: ProduceListingSnapshot): number {
    const supplierScore = clamp(listing.supplierReliabilityScore, 0, 1);
    const deliverySuccessRate = clamp(listing.deliverySuccessRate ?? supplierScore, 0, 1);
    const qualityAcceptanceRate = clamp(listing.qualityAcceptanceRate ?? (1 - (listing.qualityRejectionRate ?? 0.25)), 0, 1);

    return supplierScore * 0.45 + deliverySuccessRate * 0.30 + qualityAcceptanceRate * 0.25;
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits: number) => Number(value.toFixed(digits));

const distanceBetween = (demand: BuyerDemandLine, listing: ProduceListingSnapshot): number => haversineKm(
  listing.collectionLatitude,
  listing.collectionLongitude,
  demand.deliveryLatitude,
  demand.deliveryLongitude
);

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const radiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toRad = (degrees: number) => degrees * Math.PI / 180;
