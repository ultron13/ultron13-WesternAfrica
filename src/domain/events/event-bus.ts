import type { DomainEvent, IntegrationEvent } from "../common/domain-event.js";

export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;
export type IntegrationEventHandler<T extends IntegrationEvent = IntegrationEvent> = (event: T) => Promise<void> | void;

export interface DomainEventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(eventName: string, handler: DomainEventHandler<T>): void;
}

export interface IntegrationEventBus {
  publish<T extends IntegrationEvent>(event: T): Promise<void>;
  subscribe<T extends IntegrationEvent>(topic: string, handler: IntegrationEventHandler<T>): void;
}

