import { IntentParser, type WhatsAppIntent } from "./intent-parser.js";

export type WhatsAppRole = "UNKNOWN" | "FARMER" | "BUYER" | "FIELD_AGENT" | "DRIVER" | "OPS";

export type BotState =
  | "START"
  | "IDENTIFY_CONTACT"
  | "SELECT_ROLE"
  | "INTENT_MENU"
  | "FARMER_LIST_PRODUCT"
  | "FARMER_LIST_QUANTITY"
  | "BUYER_ORDER_PRODUCT"
  | "BUYER_ORDER_QUANTITY"
  | "TRACK_DELIVERY"
  | "REPORT_QUALITY"
  | "CONFIRMATION"
  | "HUMAN_HANDOFF"
  | "DONE";

export interface BotSessionSnapshot {
  id: string;
  phoneNumber: string;
  state: BotState;
  role: WhatsAppRole;
  context: Record<string, unknown>;
}

export interface BotTransition {
  nextState: BotState;
  replies: string[];
  contextPatch?: Record<string, unknown>;
  handoff?: boolean;
}

export class WhatsAppStateMachine {
  constructor(private readonly intentParser = new IntentParser()) {}

  transition(session: BotSessionSnapshot, inboundText: string): BotTransition {
    const text = inboundText.trim().toLowerCase();
    const parsed = this.intentParser.parse(inboundText);

    if (parsed.intent === "HUMAN_HANDOFF") {
      return { nextState: "HUMAN_HANDOFF", replies: ["I am handing this to the FarmConnect operations team now."], handoff: true };
    }

    switch (session.state) {
      case "START":
      case "IDENTIFY_CONTACT":
        return {
          nextState: "SELECT_ROLE",
          replies: ["Welcome to FarmConnect SA. Reply 1 for farmer, 2 for buyer, 3 for field agent, 4 for driver."]
        };
      case "SELECT_ROLE":
        return this.selectRole(text, parsed.intent);
      case "INTENT_MENU":
        return this.intentMenu(session.role, text, parsed.intent);
      case "FARMER_LIST_PRODUCT":
        return { nextState: "FARMER_LIST_QUANTITY", replies: ["How many kilograms are available?"], contextPatch: { productName: parsed.entities.productName ?? inboundText.trim() } };
      case "FARMER_LIST_QUANTITY":
        return { nextState: "CONFIRMATION", replies: ["Thanks. Your listing is queued for field verification."], contextPatch: { quantityKg: parsed.entities.quantityKg ?? Number.parseFloat(text) } };
      case "BUYER_ORDER_PRODUCT":
        return { nextState: "BUYER_ORDER_QUANTITY", replies: ["How many kilograms do you need?"], contextPatch: { productName: parsed.entities.productName ?? inboundText.trim() } };
      case "BUYER_ORDER_QUANTITY":
        return { nextState: "CONFIRMATION", replies: ["Got it. We are checking available supply and will send a quote shortly."], contextPatch: { quantityKg: parsed.entities.quantityKg ?? Number.parseFloat(text) } };
      case "TRACK_DELIVERY":
        return { nextState: "DONE", replies: ["Your latest delivery status will be sent as soon as the route plan updates."] };
      case "REPORT_QUALITY":
        return { nextState: "HUMAN_HANDOFF", replies: ["Please send a photo of the issue. An operations agent will review it."], handoff: true };
      case "CONFIRMATION":
      case "DONE":
        return { nextState: "INTENT_MENU", replies: [this.menuFor(session.role)] };
      case "HUMAN_HANDOFF":
        return { nextState: "HUMAN_HANDOFF", replies: ["The operations team has this conversation."] };
      default:
        return { nextState: "INTENT_MENU", replies: [this.menuFor(session.role)] };
    }
  }

  private selectRole(text: string, intent: WhatsAppIntent): BotTransition {
    const roleByInput: Record<string, WhatsAppRole> = {
      "1": "FARMER",
      farmer: "FARMER",
      "2": "BUYER",
      buyer: "BUYER",
      "3": "FIELD_AGENT",
      "field agent": "FIELD_AGENT",
      "4": "DRIVER",
      driver: "DRIVER"
    };
    const roleByIntent: Partial<Record<WhatsAppIntent, WhatsAppRole>> = {
      SELECT_FARMER_ROLE: "FARMER",
      SELECT_BUYER_ROLE: "BUYER",
      SELECT_FIELD_AGENT_ROLE: "FIELD_AGENT",
      SELECT_DRIVER_ROLE: "DRIVER"
    };
    const role = roleByIntent[intent] ?? roleByInput[text] ?? "UNKNOWN";
    return {
      nextState: "INTENT_MENU",
      replies: [this.menuFor(role)],
      contextPatch: { role }
    };
  }

  private intentMenu(role: WhatsAppRole, text: string, intent: WhatsAppIntent): BotTransition {
    if (role === "FARMER") {
      if (text === "1" || intent === "LIST_PRODUCE") return { nextState: "FARMER_LIST_PRODUCT", replies: ["What produce do you want to list?"] };
      if (text === "2" || intent === "CHECK_PAYOUT") return { nextState: "DONE", replies: ["Your latest payout status will be sent shortly."] };
    }
    if (role === "BUYER") {
      if (text === "1" || intent === "PLACE_ORDER") return { nextState: "BUYER_ORDER_PRODUCT", replies: ["What product do you need?"] };
      if (text === "2" || intent === "TRACK_DELIVERY") return { nextState: "TRACK_DELIVERY", replies: ["Please send your order number."] };
      if (text === "3" || intent === "REPORT_QUALITY") return { nextState: "REPORT_QUALITY", replies: ["Please describe the quality issue."] };
    }
    return { nextState: "INTENT_MENU", replies: [this.menuFor(role)] };
  }

  private menuFor(role: WhatsAppRole): string {
    if (role === "FARMER") return "Reply 1 to list produce or 2 to check payout.";
    if (role === "BUYER") return "Reply 1 to order, 2 to track delivery, or 3 to report a quality issue.";
    if (role === "FIELD_AGENT") return "Reply 1 to submit grading, 2 to confirm collection.";
    if (role === "DRIVER") return "Reply 1 to confirm pickup, 2 to confirm delivery.";
    return "Reply 1 for farmer, 2 for buyer, 3 for field agent, 4 for driver.";
  }
}
