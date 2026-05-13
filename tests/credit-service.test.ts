import { describe, it, expect } from "vitest";
import { CreditService } from "../src/application/finance/credit-service.js";

describe("CreditService", () => {
  const service = new CreditService();

  it("should approve credit for good applicant", () => {
    const result = service.assess({
      organizationId: "org-1",
      requestedAmount: 10000,
      reliabilityScore: 0.9,
      repeatOrderRate: 0.8,
      averageMonthlyGmv: 50000,
      disputeRate: 0.05,
      paymentTimelinessRate: 0.95
    });

    expect(result.approved).toBe(true);
    expect(result.limitAmount).toBeGreaterThan(0);
  });

  it("should deny credit for high risk applicant", () => {
    const result = service.assess({
      organizationId: "org-2",
      requestedAmount: 10000,
      reliabilityScore: 0.3,
      repeatOrderRate: 0.2,
      averageMonthlyGmv: 1000,
      disputeRate: 0.5,
      paymentTimelinessRate: 0.3
    });

    expect(result.approved).toBe(false);
  });
});