import Bull from 'bull';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let _warned = false;

// Mock queue that logs but doesn't crash when Redis is unavailable
function createMockQueue(name: string): Bull.Queue {
  if (!_warned) {
    console.warn(`[queues] Redis not available — job queuing disabled. Start Redis or set REDIS_URL to enable.`);
    _warned = true;
  }
  const noop = () => {};
  return {
    add: async (data: any) => {
      console.log(`[mock-queue:${name}] Job queued (mock):`, JSON.stringify(data).slice(0, 100));
      return { id: `mock-${Date.now()}`, data };
    },
    process: noop,
    on: noop,
    close: async () => {},
    getJob: async () => null,
    name,
  } as any;
}

function createQueue(name: string): Bull.Queue {
  try {
    const queue = new Bull(name, redisUrl, {
      settings: { stalledInterval: 30000, maxStalledCount: 2 },
    });
    queue.on('error', (err) => {
      if (!_warned) {
        console.warn(`[queues] Redis connection error: ${err.message} — switching to mock`);
        _warned = true;
      }
    });
    return queue;
  } catch {
    return createMockQueue(name);
  }
}

export const mediaPipelineQueue = createQueue('media-pipeline');
export const ugcPipelineQueue = createQueue('ugc-pipeline');
