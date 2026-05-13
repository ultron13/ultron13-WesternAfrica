import { randomUUID } from "node:crypto";
import { WhatsAppStateMachine, type BotSessionSnapshot } from "./whatsapp-state-machine.js";
import type { InboundWhatsAppMessage, WhatsAppProvider } from "../../infrastructure/whatsapp/whatsapp-provider.js";

export interface BotSessionRepository {
  findByPhoneNumber(phoneNumber: string): Promise<BotSessionSnapshot | null>;
  save(session: BotSessionSnapshot): Promise<void>;
}

export class HandleInboundWhatsAppMessage {
  constructor(
    private readonly sessions: BotSessionRepository,
    private readonly provider: WhatsAppProvider,
    private readonly machine = new WhatsAppStateMachine()
  ) {}

  async execute(message: InboundWhatsAppMessage): Promise<void> {
    const session = await this.sessions.findByPhoneNumber(message.from) ?? {
      id: randomUUID(),
      phoneNumber: message.from,
      state: "START",
      role: "UNKNOWN",
      context: {}
    };

    const transition = this.machine.transition(session, message.text ?? "");
    const nextRole = transition.contextPatch?.role ?? session.role;

    await this.sessions.save({
      ...session,
      state: transition.nextState,
      role: typeof nextRole === "string" ? nextRole as BotSessionSnapshot["role"] : session.role,
      context: { ...session.context, ...transition.contextPatch }
    });

    for (const reply of transition.replies) {
      await this.provider.sendText(message.from, reply);
    }

    await this.provider.markRead(message.providerMessageId);
  }
}
