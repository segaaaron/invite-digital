export type RateLimiter = {
  /** Records the attempt and answers whether it exceeds the window's allowance. */
  isLimited(key: string, now: number): boolean
}

/**
 * In-memory limiter: enough for a single container. The Plan B moves it to Postgres
 * once there is more than one replica, because each replica keeps its own map.
 */
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }): RateLimiter {
  const attempts = new Map<string, number[]>()

  return {
    isLimited(key: string, now: number): boolean {
      const recent = (attempts.get(key) ?? []).filter((stamp) => now - stamp < windowMs)
      attempts.set(key, [...recent, now])
      return recent.length >= max
    },
  }
}
