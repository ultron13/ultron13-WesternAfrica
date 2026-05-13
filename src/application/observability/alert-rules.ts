import { alertsTriggeredTotal } from "../../infrastructure/observability/metrics.js";

export type AlertSeverity = "warning" | "critical";

export interface OperationalAlert {
  type: "DELIVERY_DELAY" | "MATCHING_FAILED" | "PAYMENT_DELAY" | "SPOILAGE_RISK";
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}

export class AlertRules {
  evaluate(input: {
    deliveryHours?: number;
    matchingCandidateCount?: number;
    paymentDelayHours?: number;
    spoilageProbability?: number;
  }): OperationalAlert[] {
    const alerts: OperationalAlert[] = [];

    if (input.deliveryHours !== undefined && input.deliveryHours > 24) {
      alerts.push({ type: "DELIVERY_DELAY", severity: "critical", message: "Delivery exceeded 24 hours.", metadata: { deliveryHours: input.deliveryHours } });
    }
    if (input.matchingCandidateCount !== undefined && input.matchingCandidateCount === 0) {
      alerts.push({ type: "MATCHING_FAILED", severity: "warning", message: "No eligible supply candidates found." });
    }
    if (input.paymentDelayHours !== undefined && input.paymentDelayHours > 48) {
      alerts.push({ type: "PAYMENT_DELAY", severity: "critical", message: "Farmer payout exceeded 48-hour SLA.", metadata: { paymentDelayHours: input.paymentDelayHours } });
    }
    if (input.spoilageProbability !== undefined && input.spoilageProbability > 0.3) {
      alerts.push({ type: "SPOILAGE_RISK", severity: "critical", message: "Spoilage probability exceeded allocation threshold.", metadata: { spoilageProbability: input.spoilageProbability } });
    }

    for (const alert of alerts) {
      alertsTriggeredTotal.inc({ type: alert.type, severity: alert.severity });
    }

    return alerts;
  }
}

