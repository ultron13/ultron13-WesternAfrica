export interface FinancingApplication {
  organizationId: string;
  type: "farmer_advance" | "buyer_credit" | "working_capital";
  amount: number;
  termDays: number;
  purpose: string;
  collateral?: string[];
}

export interface FinancingDecision {
  approved: boolean;
  amount: number;
  interestRate: number;
  termDays: number;
  monthlyPayment: number;
  totalRepayment: number;
  riskAssessment: string;
  conditions: string[];
}

export class FinancingService {
  assess(application: FinancingApplication): FinancingDecision {
    const baseRate = 0.15; // 15% APR
    const riskPremium = this.calculateRiskPremium(application);
    const interestRate = baseRate + riskPremium;

    const conditions: string[] = [];
    let approved = true;
    let adjustedAmount = application.amount;

    // Risk assessment
    if (application.type === "farmer_advance") {
      if (application.termDays > 90) {
        conditions.push("Term reduced to 90 days for farmer advances");
        application.termDays = 90;
      }
      if (application.amount > 50000) {
        adjustedAmount = 50000;
        conditions.push("Amount capped at R50,000 for farmer advances");
      }
    } else if (application.type === "buyer_credit") {
      if (application.termDays > 30) {
        conditions.push("Term reduced to 30 days for buyer credit");
        application.termDays = 30;
      }
    }

    // Calculate payments
    const totalInterest = adjustedAmount * interestRate * (application.termDays / 365);
    const totalRepayment = adjustedAmount + totalInterest;
    const monthlyPayment = totalRepayment / Math.max(1, application.termDays / 30);

    const riskAssessment = this.generateRiskAssessment(application, riskPremium);

    return {
      approved,
      amount: adjustedAmount,
      interestRate: round(interestRate, 4),
      termDays: application.termDays,
      monthlyPayment: round(monthlyPayment, 2),
      totalRepayment: round(totalRepayment, 2),
      riskAssessment,
      conditions
    };
  }

  private calculateRiskPremium(application: FinancingApplication): number {
    let premium = 0;

    if (application.type === "farmer_advance") premium += 0.05; // Higher risk
    if (application.termDays > 60) premium += 0.02;
    if (application.amount > 100000) premium += 0.03;

    return Math.min(premium, 0.10); // Cap at 10%
  }

  private generateRiskAssessment(application: FinancingApplication, riskPremium: number): string {
    if (riskPremium < 0.02) return "Low Risk";
    if (riskPremium < 0.05) return "Medium Risk";
    return "High Risk";
  }
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));