require('dotenv').config();
const { Redis } = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
redis.flushdb().then(() => {
  console.log("Redis cache cleared!");
  process.exit(0);
}).catch(err => {
  console.error("Redis error:", err);
  process.exit(1);
});
