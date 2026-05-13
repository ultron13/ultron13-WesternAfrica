export interface QueueLoad {
  queueName: string;
  waitingJobs: number;
  activeJobs: number;
  currentWorkers: number;
}

export interface WorkerScaleRecommendation {
  queueName: string;
  waitingJobs: number;
  activeJobs: number;
  currentWorkers: number;
  recommendedWorkers: number;
  reason: string;
}

export class WorkerScalingService {
  recommend(load: QueueLoad): WorkerScaleRecommendation {
    const pressure = load.waitingJobs + load.activeJobs * 0.5;
    const recommendedWorkers = clamp(Math.ceil(pressure / 25), 1, 20);
    const reason = recommendedWorkers > load.currentWorkers
      ? "Scale up: queue pressure exceeds current worker capacity."
      : recommendedWorkers < load.currentWorkers
        ? "Scale down: queue pressure is below current worker capacity."
        : "Hold: current worker count is appropriate.";

    return {
      ...load,
      recommendedWorkers,
      reason
    };
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

