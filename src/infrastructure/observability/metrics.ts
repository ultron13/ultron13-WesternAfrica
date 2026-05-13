import client from "prom-client";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "farmconnect_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

export const matchingScore = new client.Histogram({
  name: "farmconnect_matching_score",
  help: "Distribution of generated matching recommendation scores",
  buckets: [0.1, 0.25, 0.5, 0.65, 0.8, 0.9, 1]
});

export const logisticsSlaRisk = new client.Histogram({
  name: "farmconnect_logistics_sla_risk",
  help: "Distribution of logistics SLA risk scores",
  buckets: [0.05, 0.15, 0.3, 0.5, 0.75, 1]
});

export const ledgerPostingsTotal = new client.Counter({
  name: "farmconnect_ledger_postings_total",
  help: "Total posted ledger entries"
});

export const ordersCreatedTotal = new client.Counter({
  name: "farmconnect_orders_created_total",
  help: "Total created orders"
});

export const ordersFailedTotal = new client.Counter({
  name: "farmconnect_orders_failed_total",
  help: "Total failed or cancelled orders"
});

export const deliveryTimeHours = new client.Histogram({
  name: "farmconnect_delivery_time_hours",
  help: "Observed delivery duration in hours",
  buckets: [6, 12, 18, 24, 36, 48, 72]
});

export const spoilageRate = new client.Histogram({
  name: "farmconnect_spoilage_rate",
  help: "Observed or estimated spoilage rate",
  buckets: [0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 1]
});

export const alertsTriggeredTotal = new client.Counter({
  name: "farmconnect_alerts_triggered_total",
  help: "Total operational alerts triggered",
  labelNames: ["type", "severity"]
});

register.registerMetric(httpRequestDuration);
register.registerMetric(matchingScore);
register.registerMetric(logisticsSlaRisk);
register.registerMetric(ledgerPostingsTotal);
register.registerMetric(ordersCreatedTotal);
register.registerMetric(ordersFailedTotal);
register.registerMetric(deliveryTimeHours);
register.registerMetric(spoilageRate);
register.registerMetric(alertsTriggeredTotal);
