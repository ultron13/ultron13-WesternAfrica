import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { HandleInboundWhatsAppMessage } from "../../../application/whatsapp/handle-inbound-message.js";

const inboundSchema = z.object({
  provider: z.enum(["clickatell", "twilio"]).default("clickatell"),
  providerMessageId: z.string().default(() => randomUUID()),
  from: z.string(),
  to: z.string(),
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  raw: z.unknown().optional()
});

export class WhatsAppController {
  constructor(private readonly handler: HandleInboundWhatsAppMessage) {}

  webhook = async (request: Request, response: Response) => {
    const payload = inboundSchema.parse(request.body);
    await this.handler.execute({
      ...payload,
      receivedAt: new Date(),
      raw: payload.raw ?? request.body
    });
    response.status(202).json({ accepted: true });
  };
}
