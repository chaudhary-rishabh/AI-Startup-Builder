/**
 * Full-flow integration tests use real Redis (no ioredis-mock).
 * Loads JWT + DB URL placeholders; fullFlow.test.ts overwrites DATABASE_URL / REDIS_URL in beforeAll.
 */
import './env-setup.js'
