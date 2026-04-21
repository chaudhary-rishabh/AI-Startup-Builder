import { currentMonthDateString, getOrCreateMonthlyUsage, addBonusTokens } from '../db/queries/tokenUsage.queries.js'
import { getRedis } from '../lib/redis.js'

export async function grantBonusCredits(
  userId: string,
  tokensToGrant: number,
  _grantedByAdminId: string,
  _reason: string,
): Promise<{ newBonusTotal: number }> {
  const month = currentMonthDateString()
  await getOrCreateMonthlyUsage(userId, month)
  const updated = await addBonusTokens(userId, month, BigInt(tokensToGrant))
  const redis = getRedis()
  await redis.del(`billing:budget:${userId}`)
  return { newBonusTotal: Number(updated.bonusTokens) }
}
