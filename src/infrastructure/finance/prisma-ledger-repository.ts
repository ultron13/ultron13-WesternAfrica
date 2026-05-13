import type { Prisma, PrismaClient } from "@prisma/client";
import type { LedgerPostingLine, LedgerRepository } from "../../application/finance/ledger-service.js";
import { ledgerPostingsTotal } from "../observability/metrics.js";
import { prisma } from "../prisma/client.js";

export class PrismaLedgerRepository implements LedgerRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async post(lines: LedgerPostingLine[], transactionId: string): Promise<void> {
    await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const [index, line] of lines.entries()) {
        await tx.ledgerEntry.create({
          data: {
            transactionId,
            debitAccountId: line.debitAccountId,
            creditAccountId: line.creditAccountId,
            orderId: line.orderId,
            amount: line.amount,
            reference: line.reference,
            description: line.description,
            idempotencyKey: `${transactionId}:${index}`,
            metadata: line.metadata
          }
        });
        ledgerPostingsTotal.inc();
      }
    });
  }
}
