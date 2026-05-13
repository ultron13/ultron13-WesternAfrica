export type ProduceListingStatus = "DRAFT" | "ACTIVE" | "RESERVED" | "COLLECTED" | "EXHAUSTED" | "SUSPENDED" | "EXPIRED" | "CANCELLED";

export interface ProduceListingSnapshot {
  id: string;
  organizationId: string;
  farmId?: string;
  productId: string;
  productName: string;
  gradeCode: string;
  quantityKg: number;
  reservedKg: number;
  farmGatePricePerKg: number;
  harvestDate: Date;
  availableFrom: Date;
  availableUntil: Date;
  collectionPointId: string;
  collectionLatitude: number;
  collectionLongitude: number;
  supplierReliabilityScore: number;
  deliverySuccessRate?: number;
  qualityAcceptanceRate?: number;
  qualityRejectionRate?: number;
  smallholderShare: number;
  complianceApproved: boolean;
  coldChainRequired?: boolean;
  maxTransitHours?: number;
  idealTransitHours?: number;
  baseSpoilageRatePerHour?: number;
  unrefrigeratedPenalty?: number;
  status: ProduceListingStatus;
}
