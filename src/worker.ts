import { createWorker, QueueNames } from "./infrastructure/queue/queues.js";
import { logger } from "./infrastructure/logging/logger.js";

const workers = [
  createWorker(QueueNames.integrationEvents, async (job) => {
    logger.info({ jobId: job.id, name: job.name }, "integration event job received");
  }),
  createWorker(QueueNames.whatsappOutbound, async (job) => {
    logger.info({ jobId: job.id, name: job.name }, "whatsapp outbound job received");
  }),
  createWorker(QueueNames.routeOptimization, async (job) => {
    logger.info({ jobId: job.id, name: job.name }, "route optimization job received");
  }),
  createWorker(QueueNames.paymentReconciliation, async (job) => {
    logger.info({ jobId: job.id, name: job.name }, "payment reconciliation job received");
  })
];

for (const worker of workers) {
  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, queue: worker.name, error }, "worker job failed");
  });
}

logger.info({ queues: workers.map((worker) => worker.name) }, "FarmConnect worker listening");

