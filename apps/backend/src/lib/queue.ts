import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedis } from './redis.js';
import { getLogger } from './logger.js';

const SUBMISSION_QUEUE_NAME = 'onchain-submissions';

let submissionQueue: Queue;
let submissionQueueEvents: QueueEvents;

export function createSubmissionQueue(): Queue {
  const redis = getRedis();
  submissionQueue = new Queue(SUBMISSION_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });
  return submissionQueue;
}

export function createQueueEvents(): QueueEvents {
  submissionQueueEvents = new QueueEvents(SUBMISSION_QUEUE_NAME, {
    connection: getRedis(),
  });
  return submissionQueueEvents;
}

export function getSubmissionQueue(): Queue {
  if (!submissionQueue) {
    throw new Error('Submission queue not created.');
  }
  return submissionQueue;
}

export function getQueueEvents(): QueueEvents {
  if (!submissionQueueEvents) {
    throw new Error('Queue events not created.');
  }
  return submissionQueueEvents;
}

export async function closeQueue(): Promise<void> {
  await Promise.all([
    submissionQueue?.close(),
    submissionQueueEvents?.close(),
  ]);
}
