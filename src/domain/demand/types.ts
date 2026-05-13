export interface BuyerDemandLine {
  id: string;
  buyerOrganizationId: string;
  productId: string;
  productName: string;
  requiredQuantityKg: number;
  acceptedGradeCodes: string[];
  allowSubstitution: boolean;
  maxDeliveredPricePerKg: number;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryWindowStart: Date;
  deliveryWindowEnd: Date;
  paymentTermsDays: number;
  buyerReliabilityScore?: number;
}
