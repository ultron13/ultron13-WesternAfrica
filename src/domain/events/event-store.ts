import type { DomainEvent } from "../common/domain-event.js";

export interface StoredDomainEvent<TPayload = Record<string, unknown>> extends DomainEvent<TPayload> {
  readonly streamId: string;
  readonly streamType: string;
  readonly eventVersion: number;
  readonly sequence: bigint;
  readonly metadata?: Record<string, unknown>;
}

export interface EventStore {
  append(event: Omit<StoredDomainEvent, "sequence">): Promise<StoredDomainEvent>;
  loadStream(streamId: string): Promise<StoredDomainEvent[]>;
  loadFromSequence(sequence: bigint, limit: number): Promise<StoredDomainEvent[]>;
}

