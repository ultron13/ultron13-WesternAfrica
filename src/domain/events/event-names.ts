export const DomainEvents = {
  produceListed: "ProduceListed",
  buyerDemandCreated: "BuyerDemandCreated",
  matchRecommendationCreated: "MatchRecommendationCreated",
  aggregationBatchCreated: "AggregationBatchCreated",
  orderConfirmed: "OrderConfirmed",
  shipmentPlanned: "ShipmentPlanned",
  shipmentDelivered: "ShipmentDelivered",
  deliveryAccepted: "DeliveryAccepted",
  disputeOpened: "DisputeOpened",
  invoiceIssued: "InvoiceIssued",
  paymentCaptured: "PaymentCaptured",
  payoutScheduled: "PayoutScheduled"
} as const;

export const IntegrationEvents = {
  whatsappSendRequested: "whatsapp.message.send.requested",
  paymentIntentCreateRequested: "payment.intent.create.requested",
  payoutCreateRequested: "payment.payout.create.requested",
  carrierAssignmentRequested: "logistics.carrier.assignment.requested",
  invoiceRenderRequested: "invoice.render.requested",
  metricRecorded: "analytics.metric.recorded"
} as const;

