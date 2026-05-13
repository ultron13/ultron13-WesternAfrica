import type { BotSessionRepository } from "../../application/whatsapp/handle-inbound-message.js";
import type { BotSessionSnapshot } from "../../application/whatsapp/whatsapp-state-machine.js";
import { env } from "../config/env.js";
import { redis } from "../redis/redis-client.js";

export class RedisBotSessionRepository implements BotSessionRepository {
  private readonly prefix = "whatsapp:session:";

  async findByPhoneNumber(phoneNumber: string): Promise<BotSessionSnapshot | null> {
    const raw = await redis.get(this.key(phoneNumber));
    if (!raw) return null;

    return JSON.parse(raw) as BotSessionSnapshot;
  }

  async save(session: BotSessionSnapshot): Promise<void> {
    await redis.set(this.key(session.phoneNumber), JSON.stringify(session), "EX", env.WHATSAPP_SESSION_TTL_SECONDS);
  }

  async extend(phoneNumber: string): Promise<void> {
    await redis.expire(this.key(phoneNumber), env.WHATSAPP_SESSION_TTL_SECONDS);
  }

  private key(phoneNumber: string): string {
    return `${this.prefix}${phoneNumber}`;
  }
}

