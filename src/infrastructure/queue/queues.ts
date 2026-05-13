import { Queue, Worker, type JobsOptions, type Processor } from "bullmq";
import { redis } from "../redis/redis-client.js";

export const QueueNames = {
  integrationEvents: "integration-events",
  whatsappOutbound: "whatsapp-outbound",
  routeOptimization: "route-optimization",
  paymentReconciliation: "payment-reconciliation"
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

export const queues = {
  integrationEvents: new Queue(QueueNames.integrationEvents, { connection: redis }),
  whatsappOutbound: new Queue(QueueNames.whatsappOutbound, { connection: redis }),
  routeOptimization: new Queue(QueueNames.routeOptimization, { connection: redis }),
  paymentReconciliation: new Queue(QueueNames.paymentReconciliation, { connection: redis })
};

export const enqueue = async <T>(queueName: QueueName, jobName: string, data: T, options?: JobsOptions) => {
  const queue = Object.values(queues).find((candidate) => candidate.name === queueName);
  if (!queue) throw new Error(`Unknown queue: ${queueName}`);

  return queue.add(jobName, data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: 500,
    removeOnFail: 2_000,
    ...options
  });
};

export const createWorker = <T>(queueName: QueueName, processor: Processor<T>) => new Worker<T>(queueName, processor, {
  connection: redis,
  concurrency: 5
});

