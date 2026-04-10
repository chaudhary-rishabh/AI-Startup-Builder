import Redis from 'ioredis-mock'

import { setRedisForTests } from '../src/services/redis.service.js'

setRedisForTests(new Redis())
