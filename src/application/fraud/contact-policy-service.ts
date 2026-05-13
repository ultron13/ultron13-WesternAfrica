export interface ContactPolicyScanResult {
  allowed: boolean;
  riskScore: number;
  violations: string[];
  sanitizedText: string;
}

const phonePattern = /(?:\+?27|0)[6-8][0-9][\s-]?[0-9]{3}[\s-]?[0-9]{4}\b/g;
const paymentPattern = /\b(cash|eft me|pay me direct|bank account|capitec|fnb|standard bank|absa|nedbank)\b/i;
const meetingPattern = /\b(call me directly|come to my farm|meet outside|skip farmconnect|whatsapp me on)\b/i;

export class ContactPolicyService {
  scan(text: string): ContactPolicyScanResult {
    const violations: string[] = [];
    if (phonePattern.test(text)) violations.push("PHONE_EXPOSED");
    if (paymentPattern.test(text)) violations.push("DIRECT_PAYMENT_REQUEST");
    if (meetingPattern.test(text)) violations.push("OFF_PLATFORM_MEETING");

    const riskScore = Math.min(1, violations.length * 0.35);
    return {
      allowed: violations.length === 0,
      riskScore,
      violations,
      sanitizedText: text.replace(phonePattern, "[masked-phone]")
    };
  }
}

