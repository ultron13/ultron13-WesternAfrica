export type WhatsAppIntent =
  | "SELECT_FARMER_ROLE"
  | "SELECT_BUYER_ROLE"
  | "SELECT_FIELD_AGENT_ROLE"
  | "SELECT_DRIVER_ROLE"
  | "LIST_PRODUCE"
  | "CHECK_PAYOUT"
  | "PLACE_ORDER"
  | "TRACK_DELIVERY"
  | "REPORT_QUALITY"
  | "CONFIRM_PICKUP"
  | "CONFIRM_DELIVERY"
  | "HUMAN_HANDOFF"
  | "UNKNOWN";

export interface ParsedIntent {
  intent: WhatsAppIntent;
  confidence: number;
  entities: {
    quantityKg?: number;
    productName?: string;
    orderNumber?: string;
  };
}

const patterns: Array<{ intent: WhatsAppIntent; confidence: number; terms: RegExp[] }> = [
  { intent: "HUMAN_HANDOFF", confidence: 0.99, terms: [/\b(agent|human|operator|help|support)\b/i] },
  { intent: "SELECT_FARMER_ROLE", confidence: 0.98, terms: [/^1$/, /\bfarmer|farm|producer|co-?op|cooperative\b/i] },
  { intent: "SELECT_BUYER_ROLE", confidence: 0.98, terms: [/^2$/, /\bbuyer|chef|restaurant|hotel|caterer|procure/i] },
  { intent: "SELECT_FIELD_AGENT_ROLE", confidence: 0.98, terms: [/^3$/, /\bfield agent|grader|inspect/i] },
  { intent: "SELECT_DRIVER_ROLE", confidence: 0.98, terms: [/^4$/, /\bdriver|carrier|truck|delivery driver\b/i] },
  { intent: "LIST_PRODUCE", confidence: 0.92, terms: [/\blist|sell|available|harvest|tomatoes?|produce\b/i] },
  { intent: "CHECK_PAYOUT", confidence: 0.9, terms: [/\bpayout|paid|payment|money|settlement\b/i] },
  { intent: "PLACE_ORDER", confidence: 0.92, terms: [/\border|buy|need|quote|price|kg\b/i] },
  { intent: "TRACK_DELIVERY", confidence: 0.9, terms: [/\btrack|where|delivery|shipment|eta|status\b/i] },
  { intent: "REPORT_QUALITY", confidence: 0.9, terms: [/\bquality|bad|damaged|rotten|refund|credit|dispute\b/i] },
  { intent: "CONFIRM_PICKUP", confidence: 0.9, terms: [/\bpick ?up|collected|loaded\b/i] },
  { intent: "CONFIRM_DELIVERY", confidence: 0.9, terms: [/\bdelivered|pod|drop ?off|received\b/i] }
];

export class IntentParser {
  parse(input: string): ParsedIntent {
    const text = input.trim();
    const match = patterns.find((candidate) => candidate.terms.some((term) => term.test(text)));

    return {
      intent: match?.intent ?? "UNKNOWN",
      confidence: match?.confidence ?? 0,
      entities: {
        quantityKg: this.extractQuantity(text),
        productName: this.extractProduct(text),
        orderNumber: this.extractOrderNumber(text)
      }
    };
  }

  private extractQuantity(text: string): number | undefined {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|kilograms?|kilos?)\b/i);
    return match ? Number.parseFloat(match[1]) : undefined;
  }

  private extractProduct(text: string): string | undefined {
    const knownProducts = ["tomato", "tomatoes", "avocado", "avocados", "pepper", "peppers", "citrus", "potato", "potatoes"];
    return knownProducts.find((product) => new RegExp(`\\b${product}\\b`, "i").test(text));
  }

  private extractOrderNumber(text: string): string | undefined {
    return text.match(/\b(FC-[A-Z0-9-]+|ORD-[A-Z0-9-]+)\b/i)?.[1];
  }
}

