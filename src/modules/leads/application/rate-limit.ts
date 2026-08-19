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

  /** Drops keys whose attempts all expired, so a flood of distinct keys cannot grow the map forever. */
  const evictExpired = (now: number): void => {
    for (const [key, stamps] of attempts) {
      if (stamps.every((stamp) => now - stamp >= windowMs)) attempts.delete(key)
    }
  }

  return {
    isLimited(key: string, now: number): boolean {
      evictExpired(now)

      const recent = (attempts.get(key) ?? []).filter((stamp) => now - stamp < windowMs)

      // A blocked attempt is not recorded: otherwise hammering one key grows its array
      // without bound and every rejection costs more than an accepted request.
      if (recent.length >= max) {
        attempts.set(key, recent)
        return true
      }

      attempts.set(key, [...recent, now])
      return false
    },
  }
}
