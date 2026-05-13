# FarmConnect SA Enterprise SPEC

**Source:** `Business_Plan.md`  
**Method:** Specification Driven Development (SDD)  
**Target stack:** Express.js, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, WhatsApp provider adapter, Cloudflare R2  
**Architecture:** Modular monolith using Clean Architecture and DDD bounded contexts

## 1. Product Mandate

FarmConnect SA is a logistics-enabled B2B/B2G agricultural marketplace. The first production corridor is Limpopo tomatoes to Gauteng restaurants. The platform must match verified supply to buyer demand, aggregate smallholder produce into viable order quantities, coordinate cold-chain logistics, verify quality, generate auditable commercial records, and communicate through WhatsApp-first workflows.

The product is not a passive listing site. Every core module must support physical execution: collection, grading, aggregation, shipment, delivery confirmation, dispute handling, invoicing, and farmer payout within 48 hours of delivery confirmation.

## 2. Success Metrics

| Metric | Launch Target |
| --- | --- |
| Corridor | Limpopo to Gauteng |
| Product | Tomatoes first |
| Monthly breakeven volume | 54,400 kg |
| Restaurants | 25-30 weekly active at breakeven |
| Farmer payout SLA | 48 hours after confirmed delivery |
| Buyer savings | 20-36% vs current procurement |
| Initial buyer commission | 6%, then 8% after month 3 |
| Initial seller commission | 0%, then 5% after month 3 |

## 3. User Personas

- Farmer/cooperative operator: lists available produce, receives demand signals, confirms collection, receives payout.
- Field agent: verifies farmer onboarding, grades produce, captures photos, manages collection points.
- Restaurant buyer/chef: orders via WhatsApp or web, receives delivery tracking, confirms quality.
- Operations coordinator: approves matches, builds aggregation batches, assigns carriers and routes.
- Finance operator: reviews invoices, PSP references, commissions, payouts, VAT treatment.
- Government buyer: requires auditable procurement, B-BBEE and smallholder impact reporting.

## 4. Bounded Contexts

### Identity & Access

Handles users, roles, organization membership, auth policies, audit logs, and API authorization.

Roles:
- `ADMIN`
- `OPS`
- `FIELD_AGENT`
- `FARMER`
- `BUYER`
- `DRIVER`
- `FINANCE`
- `GOVERNMENT_BUYER`

### Organizations & Compliance

Handles farms, cooperatives, restaurants, logistics partners, government departments, addresses, contacts, B-BBEE, FICA/KYC, food-safety documents, POPIA consent records, and procurement metadata.

### Catalog

Defines products, units, pack sizes, grades, grading tolerances, seasonality, and zero-rated VAT classification for fresh produce.

### Supply

Handles produce listings, available quantities, collection windows, farm-gate pricing, quality photos, harvest dates, and collection points.

### Demand

Handles buyer demand, standing orders, delivery windows, accepted grades, maximum delivered price, preferred payment terms, and substitution tolerance.

### Matching & Aggregation

Scores supply against demand using price, grade, distance, freshness, reliability, B-BBEE/smallholder impact, collection windows, and logistics efficiency. Builds aggregation batches from multiple listings when one supplier cannot fulfil the order.

### Orders

Handles quote, order, order lines, commission calculation, status transitions, fulfilment state, delivery confirmation, cancellation, refunds, and disputes.

### Logistics

Handles corridors, hubs, carriers, route plans, shipments, shipment stops, collection, cross-dock, last-mile delivery, cold-chain requirements, SLA tracking, and proof of delivery.

### Quality

Handles field inspections, grading, photo verification, buyer ratings, non-conformance, dispute evidence, credit/refund recommendation, and supplier score updates.

### Payments & Finance

Integrates with licensed PSPs only. FarmConnect never acts as deposit taker. Handles payment intent, PSP reference, invoice, commission split, payout instruction, payment status, and finance reconciliation.

### WhatsApp

WhatsApp-first conversational interface for farmers, buyers, field agents, drivers, and operations alerts. Provider is abstracted so Clickatell and Twilio style APIs can both be supported.

### Events

Domain events represent facts inside the monolith. Integration events represent messages sent to external systems or async workers. Event outbox persists integration messages for reliable delivery.

## 5. Clean Architecture Rules

Layer direction:

1. `domain`: entities, value objects, enums, domain events, repository ports.
2. `application`: use cases, domain services, orchestration, transaction scripts.
3. `infrastructure`: Prisma repositories, provider clients, queues, outbox dispatchers.
4. `interfaces`: HTTP controllers, routes, webhook handlers, DTO validation.

Rules:
- Domain must not import Express, Prisma, Redis, Twilio, Clickatell, or BullMQ.
- Application may depend on domain ports and DTOs, not concrete infrastructure.
- Infrastructure implements ports.
- Interface layer calls application use cases only.
- All external side effects must emit or consume integration events.

## 6. Repo Structure

```text
.
├── Business_Plan.md
├── SPEC.md
├── package.json
├── tsconfig.json
├── .env.example
├── prisma/
│   └── schema.prisma
├── src/
│   ├── domain/
│   │   ├── common/
│   │   ├── organizations/
│   │   ├── catalog/
│   │   ├── supply/
│   │   ├── demand/
│   │   ├── orders/
│   │   ├── logistics/
│   │   ├── payments/
│   │   ├── quality/
│   │   ├── whatsapp/
│   │   └── events/
│   ├── application/
│   │   ├── matching/
│   │   ├── aggregation/
│   │   ├── logistics/
│   │   ├── orders/
│   │   └── whatsapp/
│   ├── infrastructure/
│   │   ├── config/
│   │   ├── events/
│   │   ├── prisma/
│   │   ├── whatsapp/
│   │   ├── queue/
│   │   └── logging/
│   ├── interfaces/
│   │   └── http/
│   └── shared/
└── tests/
```

## 7. Core State Machines

### Produce Listing

`DRAFT -> ACTIVE -> RESERVED -> COLLECTED -> EXHAUSTED`

Failure states:
- `SUSPENDED`: quality/compliance hold.
- `EXPIRED`: listing window passed.
- `CANCELLED`: supplier withdrew listing.

### Order

`DRAFT -> QUOTED -> CONFIRMED -> ALLOCATED -> IN_COLLECTION -> IN_TRANSIT -> DELIVERED -> ACCEPTED -> INVOICED -> PAID -> CLOSED`

Failure states:
- `CANCELLED`
- `PARTIALLY_FULFILLED`
- `DISPUTED`
- `REFUNDED`

### Shipment

`PLANNED -> ASSIGNED -> COLLECTING -> AT_HUB -> OUT_FOR_DELIVERY -> DELIVERED -> CLOSED`

Failure states:
- `DELAYED`
- `FAILED`
- `RETURNED`

### Payment

`PENDING -> AUTHORIZED -> CAPTURED -> SETTLED -> RECONCILED`

Failure states:
- `FAILED`
- `REFUNDED`
- `CHARGEBACK`

### WhatsApp Bot

`START -> IDENTIFY_CONTACT -> SELECT_ROLE -> INTENT_MENU -> FLOW_STATE -> CONFIRMATION -> HANDOFF_OR_DONE`

Persistent sessions must include:
- phone number
- current state
- role context
- selected organization
- temporary payload
- last inbound message id
- handoff flag
- expiry timestamp

Production implementation:
- session state is stored in Redis with `WHATSAPP_SESSION_TTL_SECONDS`
- raw WhatsApp messages remain in PostgreSQL for audit
- expired sessions restart from `IDENTIFY_CONTACT`
- human handoff sessions are recoverable from stored conversation history

## 8. Matching Algorithm

Inputs:
- buyer demand line
- active produce listings
- corridor and delivery window
- quality grade tolerance
- collection and delivery geography
- supplier reliability score
- buyer maximum delivered price
- current logistics capacity
- smallholder/B-BBEE impact weighting
- farmer reliability scorecard
- buyer reliability scorecard
- product perishability profile
- projected transit duration
- cold-chain capability

Score:

```text
total =
  priceScore * 0.18 +
  proximityScore * 0.12 +
  gradeScore * 0.12 +
  freshnessScore * 0.13 +
  logisticsScore * 0.12 +
  reliabilityScore * 0.14 +
  buyerScore * 0.04 +
  availabilityScore * 0.07 +
  spoilageScore * 0.05 +
  impactScore * 0.02 +
  marginScore * 0.01
```

Hard filters:
- listing is active
- product matches
- quantity available is greater than zero
- collection window can satisfy delivery window
- grade is accepted or buyer allows substitution
- supplier compliance status is approved
- corridor supports route
- spoilage probability is below configured threshold
- estimated transit duration is below product max transit hours

Outputs:
- ranked match recommendations
- expected delivered price per kg
- expected gross margin per kg
- shrinkage buffer
- collection plan candidate
- aggregation candidate id
- explainable feature vector for ML training
- spoilage probability and cold-chain risk score

ML-ready training dataset:

```text
MatchDecision {
  orderId
  demandId
  listingId
  score
  selected
  outcome: PENDING | SUCCESS | FAILED | REJECTED | EXPIRED
  featureVector
  modelVersion
}
```

Every recommendation set should persist both selected and rejected candidates. This becomes the future supervised learning dataset once real-world outcomes exist.

## 8.1 Reliability Engine

Reliability is a first-party data moat. It is stored as raw signals plus calculated scorecards.

Signals:
- on-time delivery
- late delivery
- quality accepted
- quality rejected
- order cancelled
- payment on time
- payment late
- dispute opened
- dispute resolved
- collection no-show

Scorecard:

```text
score =
  deliverySuccessRate * 0.30 +
  qualityAcceptanceRate * 0.30 +
  paymentTimelinessRate * 0.16 +
  (1 - cancellationRate) * 0.14 +
  (1 - disputeRate) * 0.10
```

Reliability must be maintained separately for farmers/sellers, buyers, and carriers. Matching must use reliability, but finance and operations must also be able to inspect the underlying signals.

## 8.2 Cold Chain And Spoilage

Each product can have a perishability profile:
- max transit hours
- ideal transit hours
- base spoilage rate per hour
- unrefrigerated penalty
- target temperature range

Every route or match involving perishable produce must calculate:
- transit hours from harvest to delivery
- spoilage probability
- cold-chain risk score
- eligibility against the product max transit constraint

Tomatoes default to high perishability with a 36-hour max transit assumption until field data overrides it.

## 9. Aggregation Algorithm

Goal: build the smallest reliable set of listings that fulfils buyer demand while preserving quality consistency and route efficiency.

Steps:
1. Run hard filters.
2. Score each listing.
3. Group by product, grade compatibility, collection point, and harvest date band.
4. Prefer single-listing fulfilment if score and quantity are sufficient.
5. Otherwise greedily build a batch from highest score listings.
6. Penalize too many suppliers in one batch.
7. Reserve quantities atomically.
8. Emit `AggregationBatchCreated`.

Constraints:
- Maximum supplier count per initial batch: 5.
- Target fill rate: 100%.
- Minimum viable load for corridor route must be configurable.
- Do not mix grades unless buyer substitution tolerance allows it.

## 10. Logistics Engine

The launch engine uses deterministic heuristics before advanced optimization, but route batching is a production requirement from Phase 2 onward.

Capabilities:
- corridor eligibility
- route distance approximation
- vehicle capacity planning
- collection sequencing
- hub cross-dock scheduling
- last-mile delivery sequencing
- cold-chain required flag
- SLA risk score
- cost per kg estimation
- shrinkage buffer calculation

Route heuristic:
1. Group shipments by corridor and delivery date.
2. Sort collection stops by collection window opening time.
3. Consolidate by collection point and hub.
4. Assign carrier by capacity, cold-chain capability, and cost.
5. Sequence delivery stops by delivery window closing time and distance cluster.
6. Calculate projected cost per kg and SLA risk.

Route batch requirements:
- every optimized batch is persisted as `RouteBatch`
- every shipment can link to a route batch
- optimizer output stores a trace for review
- batches are grouped by corridor, planned date, cold-chain requirement, and viable load
- score penalizes missed delivery windows and under-filled vehicles
- optimization target is lowest cost per kg that satisfies delivery windows

## 11. WhatsApp Integration Flow

Provider abstraction:

```text
WhatsAppProvider
  sendText(to, body)
  sendTemplate(to, templateId, variables)
  sendMedia(to, mediaUrl, caption)
  markRead(messageId)
```

Inbound flow:
1. Provider webhook receives message.
2. Verify provider signature.
3. Normalize into `InboundWhatsAppMessage`.
4. Persist raw webhook and normalized message.
5. Load or create bot session.
6. State machine resolves intent.
7. Execute use case or ask next question.
8. Persist outbound message.
9. Emit integration event for provider send.

Launch bot flows:
- Farmer: list produce, confirm collection, check payout.
- Buyer: browse price, place order, track delivery, report quality issue.
- Field agent: upload quality photo, submit grade, confirm collection.
- Driver: confirm pickup, update location, confirm delivery.
- Ops: approve match, escalate dispute, trigger handoff.

## 12. Event Bus Design

### Domain Events

Domain events are synchronous inside the application transaction boundary.

- `OrganizationOnboarded`
- `ComplianceDocumentSubmitted`
- `ProduceListed`
- `ProduceListingReserved`
- `BuyerDemandCreated`
- `MatchRecommendationCreated`
- `AggregationBatchCreated`
- `OrderConfirmed`
- `OrderAllocated`
- `QualityInspectionCompleted`
- `ShipmentPlanned`
- `ShipmentDelivered`
- `DeliveryAccepted`
- `DisputeOpened`
- `InvoiceIssued`
- `PaymentCaptured`
- `PayoutScheduled`

### Integration Events

Integration events are persisted to the outbox and delivered asynchronously.

- `whatsapp.message.send.requested`
- `payment.intent.create.requested`
- `payment.payout.create.requested`
- `storage.media.scan.requested`
- `logistics.carrier.assignment.requested`
- `invoice.render.requested`
- `email.notification.requested`
- `analytics.metric.recorded`

Outbox requirements:
- at-least-once delivery
- idempotency key
- retry count
- next retry timestamp
- dead-letter status
- correlation id
- causation id

Event store requirements:
- every meaningful domain event is appended to `DomainEventStore`
- events include `eventVersion`, `streamId`, `streamType`, `sequence`, `correlationId`, and `causationId`
- replay consumers store progress in `EventReplayCheckpoint`
- replay must support debugging allocations, payouts, disputes, and shipment state transitions
- breaking event payload changes require a new version

## 12.1 Allocation Ledger

`OrderAllocation` is the authoritative ledger tying a buyer order to the exact produce listing that fulfilled it.

Required fields:
- order id
- order line id when applicable
- listing id
- seller id
- quantity kg
- farm-gate price
- delivered price
- status
- reservation, collection, delivery, and release timestamps

Rules:
- allocation writes happen in the same database transaction as listing reservation
- payments and disputes reference allocations, not only order totals
- released allocations must include a reason
- allocation rows are never hard deleted

## 12.2 Disintermediation Protection

FarmConnect must reduce direct buyer-seller leakage without blocking legitimate operations.

Controls:
- use contact aliases instead of exposing direct phone numbers
- scan WhatsApp text for phone numbers, bank/payment requests, and off-platform language
- persist suspected violations in `ContactPolicyViolation`
- payment links must be issued by the platform or PSP integration only
- settlement and payout status are only visible inside platform-controlled channels
- repeated confirmed violations can suspend listings, buyers, or organizations
- all buyer-seller messages should move through `PlatformMessageThread`
- risky messages are sanitized or blocked before delivery
- incentives to remain on-platform include credit terms, payout guarantees, dispute resolution, and logistics insurance eligibility

## 12.3 Financial Ledger

Payments are not enough. The system must maintain a double-entry ledger for every commercial event.

Required models:
- `LedgerAccount`
- `LedgerEntry`

Rules:
- each ledger entry has a debit account and credit account
- debit and credit accounts must differ
- transaction groups use a shared transaction id
- entries are append-only; voids create reversing entries or status changes
- idempotency key is required
- order settlement must recognize seller payable, platform revenue, and PSP cash clearing

The ledger is mandatory for investor due diligence, government procurement audits, payout reconciliation, and dispute resolution.

## 12.4 Delivery SLA Engine

Delivery SLAs must be tracked as operational checkpoints, not inferred after the fact.

Required checkpoints:
- collection due
- hub arrival due
- delivery due
- buyer acceptance due
- farmer payout due

Rules:
- delivery over 24 hours triggers a critical alert for tomatoes unless product profile overrides it
- missed SLA creates a reliability signal
- repeated SLA failure penalizes supplier, carrier, or buyer score depending on root cause
- SLA records must link to order, shipment, or route batch

## 13. Production Non-Functional Requirements

- API validation on every public route.
- Correlation id on every request and event.
- Structured JSON logs.
- OpenAPI JSON and Swagger UI exposed under `/api/v1/openapi.json` and `/api/v1/docs`.
- Prometheus metrics exposed under `/api/v1/metrics`.
- Metrics must include request duration, matching score distribution, logistics SLA risk, and ledger postings.
- Metrics must also include `orders_created_total`, `orders_failed_total`, `delivery_time_hours`, `spoilage_rate`, and alert counters.
- Redis is required for WhatsApp sessions, BullMQ jobs, and worker coordination.
- Docker Compose must provide PostgreSQL, Redis, API, and worker services for local production parity.
- POPIA-aligned consent and audit trail.
- PSP references stored without card/bank credentials.
- Provider webhook payloads retained for traceability.
- Idempotent order confirmation, payment, and WhatsApp webhook handling.
- Soft delete where records are commercial or compliance evidence.
- Database migrations via Prisma.
- Background jobs through BullMQ.
- Secrets only through environment variables.

## 14. Delivery Phases

### Phase 1: Corridor Control Tower

- Organization onboarding
- Product catalog
- Produce listings
- Buyer demand
- Manual match approval
- Aggregation batch creation
- Logistics route planning
- WhatsApp notifications

### Phase 2: Transaction Engine

- Order confirmation
- Invoices
- PSP payment intents
- Farmer payout scheduling
- Dispute and credit workflow
- Outbox dispatcher

### Phase 3: Automation

- Automated matching recommendations
- Route cost optimization
- Supplier reliability scores
- Buyer standing orders
- Impact reporting
- Government procurement reporting

### Phase 4: Pilot Execution

Weeks 1-2:
- onboard 10 restaurants
- onboard 3-5 cooperatives
- load product perishability profiles
- configure masked communication and payout accounts

Weeks 3-4:
- run 50-100 real tomato corridor orders
- manually supervise matching and logistics while capturing all decisions
- measure delivery time, rejection rate, margin per kg, spoilage, payout SLA, and bypass attempts

Pilot success gates:
- median delivery under 24 hours
- rejection rate below 8%
- farmer payout within 48 hours for accepted deliveries
- positive contribution margin per kg
- at least 60% repeat order rate from restaurants

### Phase 5: Production Deployment

Production launch requirements:
- Docker image builds from `Dockerfile`.
- GitHub Actions runs Prisma validation, generation, TypeScript build, and high-severity audit on every PR.
- Deployment workflow can deploy to Fly.io using `FLY_API_TOKEN`.
- API and worker processes are independently scalable.
- PostgreSQL and Redis are managed services in production.
- Migrations are applied with `prisma migrate deploy`.
- Health, metrics, OpenAPI, and Swagger docs are exposed.

Runtime processes:
- `app`: Express API for HTTP, webhooks, docs, and metrics.
- `worker`: BullMQ consumers for integration events, WhatsApp outbound, route optimization, and payment reconciliation.

Autoscaling:
- queue depth and active jobs feed worker scale recommendations
- production provider can apply recommendations through Fly Machines, AWS ECS, GCP Cloud Run, or Kubernetes
- scale decisions must be logged and persisted for audit

## 16. Real-Time Tracking And ETA

GPS tracking:
- every driver/device ping is stored as `GpsPing`
- ETA calculations are stored as `EtaSnapshot`
- ETA model uses current location, next stop, speed, and delivery window
- late-risk feeds observability alerts and delivery SLA checkpoints

ETA output:
- target stop id
- ETA timestamp
- distance remaining
- confidence score
- late-risk score

## 17. Credit And Financing Layer

Credit is a strategic moat, not an MVP dependency. It should be introduced after real repayment and order history exists.

Models:
- `CreditFacility`
- `CreditDrawdown`
- `CreditRepayment`

Credit decision inputs:
- reliability score
- repeat order rate
- monthly GMV
- dispute rate
- payment timeliness

Rules:
- no credit without transaction history
- credit limit is capped by revenue capacity
- high dispute rates block approval
- credit events must post to the ledger
- repayment failure creates reliability signals

## 15. Acceptance Criteria

The repository is ready for first implementation when:
- Prisma schema can generate a client.
- Express server has health, webhook, matching, logistics, and order route surfaces.
- Matching engine returns ranked recommendations with explainable scores.
- Aggregation service can create a batch plan from multiple listings.
- Logistics engine can plan a corridor shipment and estimate cost per kg.
- WhatsApp bot state machine can process farmer and buyer flows.
- Event bus supports domain handlers and persisted integration outbox messages.
