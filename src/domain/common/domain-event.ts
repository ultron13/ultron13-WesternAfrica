export interface DomainEvent<TPayload = Record<string, unknown>> {
  readonly id: string;
  readonly name: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
  readonly correlationId?: string;
  readonly causationId?: string;
}

export interface IntegrationEvent<TPayload = Record<string, unknown>> {
  readonly id: string;
  readonly topic: string;
  readonly payload: TPayload;
  readonly occurredAt: Date;
  readonly idempotencyKey: string;
  readonly correlationId?: string;
  readonly causationId?: string;
}

