import type { PrismaClient } from "@prisma/client";
import type { PlatformMessageRepository } from "../../application/fraud/platform-messaging-service.js";
import { prisma } from "../prisma/client.js";

export class PrismaPlatformMessageRepository implements PlatformMessageRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async save(input: {
    threadId: string;
    senderOrganizationId?: string;
    body: string;
    sanitizedBody: string;
    riskScore: number;
    blocked: boolean;
  }): Promise<void> {
    await this.db.platformMessage.create({
      data: {
        threadId: input.threadId,
        senderOrganizationId: input.senderOrganizationId,
        body: input.body,
        sanitizedBody: input.sanitizedBody,
        riskScore: input.riskScore,
        blocked: input.blocked
      }
    });
  }
}

