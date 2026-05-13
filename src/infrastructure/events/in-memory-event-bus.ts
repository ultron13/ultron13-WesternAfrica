import type { DomainEvent, IntegrationEvent } from "../../domain/common/domain-event.js";
import type { DomainEventBus, DomainEventHandler, IntegrationEventBus, IntegrationEventHandler } from "../../domain/events/event-bus.js";

export class InMemoryDomainEventBus implements DomainEventBus {
  private readonly handlers = new Map<string, DomainEventHandler[]>();

  subscribe<T extends DomainEvent>(eventName: string, handler: DomainEventHandler<T>): void {
    const handlers = this.handlers.get(eventName) ?? [];
    handlers.push(handler as DomainEventHandler);
    this.handlers.set(eventName, handlers);
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.name) ?? [];
    await Promise.all(handlers.map((handler) => handler(event)));
  }
}

export class InMemoryIntegrationEventBus implements IntegrationEventBus {
  private readonly handlers = new Map<string, IntegrationEventHandler[]>();

  subscribe<T extends IntegrationEvent>(topic: string, handler: IntegrationEventHandler<T>): void {
    const handlers = this.handlers.get(topic) ?? [];
    handlers.push(handler as IntegrationEventHandler);
    this.handlers.set(topic, handlers);
  }

  async publish<T extends IntegrationEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.topic) ?? [];
    await Promise.all(handlers.map((handler) => handler(event)));
  }
}

