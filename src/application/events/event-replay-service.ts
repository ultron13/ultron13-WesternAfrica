import type { EventStore, StoredDomainEvent } from "../../domain/events/event-store.js";

export type ReplayHandler = (event: StoredDomainEvent) => Promise<void>;

export class EventReplayService {
  constructor(private readonly eventStore: EventStore) {}

  async replayFrom(sequence: bigint, limit: number, handler: ReplayHandler): Promise<{ replayed: number; lastSequence: bigint }> {
    const events = await this.eventStore.loadFromSequence(sequence, limit);
    let lastSequence = sequence;

    for (const event of events) {
      await handler(event);
      lastSequence = event.sequence;
    }

    return { replayed: events.length, lastSequence };
  }
}

