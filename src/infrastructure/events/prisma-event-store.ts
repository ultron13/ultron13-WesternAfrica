import type { PrismaClient } from "@prisma/client";
import type { EventStore, StoredDomainEvent } from "../../domain/events/event-store.js";
import { prisma } from "../prisma/client.js";

export class PrismaEventStore implements EventStore {
  constructor(private readonly db: PrismaClient = prisma) {}

  async append(event: Omit<StoredDomainEvent, "sequence">): Promise<StoredDomainEvent> {
    const latest = await this.db.domainEventStore.findFirst({
      where: { streamId: event.streamId },
      orderBy: { sequence: "desc" },
      select: { sequence: true }
    });

    const sequence = (latest?.sequence ?? 0n) + 1n;
    const stored = await this.db.domainEventStore.create({
      data: {
        id: event.id,
        streamId: event.streamId,
        streamType: event.streamType,
        eventName: event.name,
        eventVersion: event.eventVersion,
        sequence,
        payload: event.payload,
        metadata: event.metadata,
        correlationId: event.correlationId,
        causationId: event.causationId,
        occurredAt: event.occurredAt
      }
    });

    return {
      id: stored.id,
      name: stored.eventName,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      streamId: stored.streamId,
      streamType: stored.streamType,
      eventVersion: stored.eventVersion,
      sequence: stored.sequence,
      payload: stored.payload as Record<string, unknown>,
      metadata: stored.metadata as Record<string, unknown> | undefined,
      correlationId: stored.correlationId ?? undefined,
      causationId: stored.causationId ?? undefined,
      occurredAt: stored.occurredAt
    };
  }

  async loadStream(streamId: string): Promise<StoredDomainEvent[]> {
    const events = await this.db.domainEventStore.findMany({
      where: { streamId },
      orderBy: { sequence: "asc" }
    });

    return events.map(toStoredEvent);
  }

  async loadFromSequence(sequence: bigint, limit: number): Promise<StoredDomainEvent[]> {
    const events = await this.db.domainEventStore.findMany({
      where: { sequence: { gt: sequence } },
      orderBy: { sequence: "asc" },
      take: limit
    });

    return events.map(toStoredEvent);
  }
}

const toStoredEvent = (event: {
  id: string;
  streamId: string;
  streamType: string;
  eventName: string;
  eventVersion: number;
  sequence: bigint;
  payload: unknown;
  metadata: unknown;
  correlationId: string | null;
  causationId: string | null;
  occurredAt: Date;
}): StoredDomainEvent => ({
  id: event.id,
  name: event.eventName,
  aggregateId: event.streamId,
  aggregateType: event.streamType,
  streamId: event.streamId,
  streamType: event.streamType,
  eventVersion: event.eventVersion,
  sequence: event.sequence,
  payload: event.payload as Record<string, unknown>,
  metadata: event.metadata as Record<string, unknown> | undefined,
  correlationId: event.correlationId ?? undefined,
  causationId: event.causationId ?? undefined,
  occurredAt: event.occurredAt
});

