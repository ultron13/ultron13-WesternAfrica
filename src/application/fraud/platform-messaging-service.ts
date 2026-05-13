import { ContactPolicyService } from "./contact-policy-service.js";

export interface PlatformMessageRepository {
  save(input: {
    threadId: string;
    senderOrganizationId?: string;
    body: string;
    sanitizedBody: string;
    riskScore: number;
    blocked: boolean;
  }): Promise<void>;
}

export interface SendPlatformMessageInput {
  threadId: string;
  senderOrganizationId?: string;
  body: string;
}

export class PlatformMessagingService {
  constructor(
    private readonly messages: PlatformMessageRepository,
    private readonly contactPolicy = new ContactPolicyService(),
    private readonly blockThreshold = 0.7
  ) {}

  async send(input: SendPlatformMessageInput): Promise<{ blocked: boolean; sanitizedBody: string; riskScore: number; violations: string[] }> {
    const scan = this.contactPolicy.scan(input.body);
    const blocked = scan.riskScore >= this.blockThreshold || scan.violations.includes("DIRECT_PAYMENT_REQUEST");

    await this.messages.save({
      threadId: input.threadId,
      senderOrganizationId: input.senderOrganizationId,
      body: input.body,
      sanitizedBody: scan.sanitizedText,
      riskScore: scan.riskScore,
      blocked
    });

    return {
      blocked,
      sanitizedBody: scan.sanitizedText,
      riskScore: scan.riskScore,
      violations: scan.violations
    };
  }
}

