import type { Redis as IoRedis } from 'ioredis'
import Redis from 'ioredis-mock'

import { setRedisForTests } from '../src/lib/redis.js'

if (process.env['VITEST_USE_TESTCONTAINERS'] === '1') {
  /* Full-flow integration uses real Redis; see vitest.fullflow.config.ts */
} else {
  setRedisForTests(new Redis() as unknown as IoRedis)
}
