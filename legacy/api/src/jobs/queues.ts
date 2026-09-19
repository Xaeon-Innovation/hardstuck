import Bull from 'bull';
import { env } from '../config/env';

let emailQueue: Bull.Queue | null = null;
let payoutQueue: Bull.Queue | null = null;
let reverifyQueue: Bull.Queue | null = null;

export function initJobQueues(): void {
  try {
    emailQueue = new Bull('email', env.redisUrl);
    payoutQueue = new Bull('weekly-payouts', env.redisUrl);
    reverifyQueue = new Bull('reverification', env.redisUrl);

    emailQueue.process(async (job) => {
      console.log('[job:email] stub send', job.data);
      return { ok: true, stub: true };
    });

    payoutQueue.process(async (job) => {
      // Weekly payout shell: release held booster earnings (48h hold)
      console.log('[job:weekly-payouts] stub process', job.data);
      return { ok: true, stub: true };
    });

    reverifyQueue.process(async (job) => {
      console.log('[job:reverification] stub reminder', job.data);
      return { ok: true, stub: true };
    });

    console.log('Bull job queues initialized');
  } catch (err) {
    console.warn('Bull queues unavailable (Redis down?) — continuing without jobs', err);
  }
}

export async function enqueueEmail(data: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  if (!emailQueue) return;
  await emailQueue.add(data);
}

export async function enqueueWeeklyPayouts(): Promise<void> {
  if (!payoutQueue) return;
  await payoutQueue.add({ cycle: new Date().toISOString() });
}

export { emailQueue, payoutQueue, reverifyQueue };
