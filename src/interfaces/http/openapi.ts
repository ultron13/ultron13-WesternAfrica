import type { OpenAPIV3 } from "openapi-types";

export const openApiDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "FarmConnect SA API",
    version: "0.2.0",
    description: "Enterprise backend API for corridor matching, aggregation, logistics, WhatsApp, and event-driven operations."
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: { "200": { description: "Service is healthy" } }
      }
    },
    "/metrics": {
      get: {
        summary: "Prometheus metrics endpoint",
        responses: { "200": { description: "Prometheus exposition format" } }
      }
    },
    "/matching/recommendations": {
      post: {
        summary: "Generate ranked supply recommendations for a buyer demand line",
        responses: { "200": { description: "Ranked recommendations" }, "400": { description: "Validation error" } }
      }
    },
    "/aggregation/batch-plan": {
      post: {
        summary: "Create an aggregation plan from multiple produce listings",
        responses: { "200": { description: "Aggregation batch plan" }, "400": { description: "Validation error" } }
      }
    },
    "/logistics/route-plan": {
      post: {
        summary: "Plan a single route with capacity and delivery-window constraints",
        responses: { "200": { description: "Route plan" }, "400": { description: "Validation error" } }
      }
    },
    "/logistics/route-batch-plan": {
      post: {
        summary: "Optimize a route batch by corridor, load, delivery windows, and cost per kg",
        responses: { "200": { description: "Route batch plan" }, "400": { description: "Validation error" } }
      }
    },
    "/webhooks/whatsapp": {
      post: {
        summary: "Receive normalized Clickatell/Twilio-style WhatsApp webhook messages",
        responses: { "202": { description: "Accepted for processing" }, "400": { description: "Validation error" } }
      }
    }
  }
};
