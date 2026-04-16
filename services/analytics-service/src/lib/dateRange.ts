import { env } from '../config/env.js'
import { AppError } from './errors.js'

export interface DateRange {
  fromDate: Date
  toDate: Date
  granularity: 'day' | 'week' | 'month'
  cacheKey: string
}

export function validateDateRange(from: string, to: string, granularity = 'day'): DateRange {
  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T23:59:59.999Z`)

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new AppError('INVALID_DATE_RANGE', 'Invalid date format.', 400)
  }
  if (fromDate > toDate) {
    throw new AppError('INVALID_DATE_RANGE', 'from must be before to.', 422)
  }
  const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays > env.MAX_DATE_RANGE_DAYS) {
    throw new AppError(
      'INVALID_DATE_RANGE',
      `Date range cannot exceed ${env.MAX_DATE_RANGE_DAYS} days.`,
      422,
    )
  }
  if (!['day', 'week', 'month'].includes(granularity)) {
    throw new AppError('INVALID_DATE_RANGE', 'granularity must be day, week, or month.', 422)
  }

  return {
    fromDate,
    toDate,
    granularity: granularity as DateRange['granularity'],
    cacheKey: `${from}:${to}:${granularity}`,
  }
}
