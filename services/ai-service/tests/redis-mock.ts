import type { Redis as IoRedis } from 'ioredis'
import Redis from 'ioredis-mock'

import { setRedisForTests } from '../src/lib/redis.js'

setRedisForTests(new Redis() as unknown as IoRedis)
