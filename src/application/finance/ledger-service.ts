export interface LedgerPostingLine {
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  reference: string;
  description?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerRepository {
  post(lines: LedgerPostingLine[], transactionId: string): Promise<void>;
}

export class LedgerService {
  constructor(private readonly ledgerRepository: LedgerRepository) {}

  async postTransaction(transactionId: string, lines: LedgerPostingLine[]): Promise<void> {
    if (lines.length === 0) throw new Error("Ledger transaction requires at least one line.");

    for (const line of lines) {
      if (line.amount <= 0) throw new Error("Ledger entry amount must be positive.");
      if (line.debitAccountId === line.creditAccountId) throw new Error("Debit and credit accounts must differ.");
    }

    await this.ledgerRepository.post(lines, transactionId);
  }

  buildOrderSettlement(input: {
    orderId: string;
    buyerReceivableAccountId: string;
    sellerPayableAccountId: string;
    platformRevenueAccountId: string;
    cashClearingAccountId: string;
    sellerAmount: number;
    platformFee: number;
    reference: string;
  }): LedgerPostingLine[] {
    return [
      {
        debitAccountId: input.buyerReceivableAccountId,
        creditAccountId: input.sellerPayableAccountId,
        amount: input.sellerAmount,
        reference: input.reference,
        description: "Recognize seller payable for accepted delivery",
        orderId: input.orderId
      },
      {
        debitAccountId: input.buyerReceivableAccountId,
        creditAccountId: input.platformRevenueAccountId,
        amount: input.platformFee,
        reference: input.reference,
        description: "Recognize FarmConnect commission revenue",
        orderId: input.orderId
      },
      {
        debitAccountId: input.cashClearingAccountId,
        creditAccountId: input.buyerReceivableAccountId,
        amount: input.sellerAmount + input.platformFee,
        reference: input.reference,
        description: "Clear buyer payment through PSP",
        orderId: input.orderId
      }
    ];
  }
}

