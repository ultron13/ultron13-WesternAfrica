export interface WhatsAppProvider {
  sendText(to: string, body: string): Promise<void>;
  sendTemplate(to: string, templateId: string, variables: Record<string, string>): Promise<void>;
  sendMedia(to: string, mediaUrl: string, caption?: string): Promise<void>;
  markRead(messageId: string): Promise<void>;
}

export interface InboundWhatsAppMessage {
  provider: "clickatell" | "twilio";
  providerMessageId: string;
  from: string;
  to: string;
  text?: string;
  mediaUrl?: string;
  receivedAt: Date;
  raw: unknown;
}

export class LoggingWhatsAppProvider implements WhatsAppProvider {
  async sendText(to: string, body: string): Promise<void> {
    console.log(JSON.stringify({ channel: "whatsapp", action: "sendText", to, body }));
  }

  async sendTemplate(to: string, templateId: string, variables: Record<string, string>): Promise<void> {
    console.log(JSON.stringify({ channel: "whatsapp", action: "sendTemplate", to, templateId, variables }));
  }

  async sendMedia(to: string, mediaUrl: string, caption?: string): Promise<void> {
    console.log(JSON.stringify({ channel: "whatsapp", action: "sendMedia", to, mediaUrl, caption }));
  }

  async markRead(messageId: string): Promise<void> {
    console.log(JSON.stringify({ channel: "whatsapp", action: "markRead", messageId }));
  }
}

