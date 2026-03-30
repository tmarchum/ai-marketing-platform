import Bull from 'bull';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const mediaPipelineQueue = new Bull('media-pipeline', redisUrl);
export const ugcPipelineQueue = new Bull('ugc-pipeline', redisUrl);
