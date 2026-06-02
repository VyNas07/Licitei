import { Elysia } from 'elysia'
import { config } from '../config'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

const getClientKey = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const authorization = request.headers.get('authorization')?.trim()

  return forwardedFor || realIp || authorization || 'anonymous'
}

const cleanupExpiredBuckets = (now: number) => {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key)
  }
}

export const rateLimitPlugin = new Elysia({ name: 'rate-limit' }).onRequest(({ request, set }) => {
  const now = Date.now()
  const windowMs = Math.max(1, config.rateLimit.windowMs)
  const maxRequests = Math.max(1, config.rateLimit.maxRequests)
  const key = getClientKey(request)
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  current.count += 1

  if (current.count > maxRequests) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000)

    set.status = 429
    set.headers['Retry-After'] = String(retryAfterSeconds)
    set.headers['X-RateLimit-Limit'] = String(maxRequests)
    set.headers['X-RateLimit-Remaining'] = '0'
    set.headers['X-RateLimit-Reset'] = String(Math.ceil(current.resetAt / 1000))

    return {
      error: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfterSeconds,
    }
  }

  set.headers['X-RateLimit-Limit'] = String(maxRequests)
  set.headers['X-RateLimit-Remaining'] = String(maxRequests - current.count)
  set.headers['X-RateLimit-Reset'] = String(Math.ceil(current.resetAt / 1000))

  if (buckets.size > 10_000) cleanupExpiredBuckets(now)
})
