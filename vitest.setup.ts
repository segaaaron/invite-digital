import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { afterEach } from 'vitest'

// vitest.config.ts does not enable `globals`, so Testing Library's automatic
// afterEach cleanup never registers. Do it explicitly to unmount between tests.
afterEach(() => {
  cleanup()
})

// jsdom has no IntersectionObserver; framer-motion's `whileInView` needs one.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve(): void {}
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
}

// Load .env file for tests
const envPath = resolve(process.cwd(), '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')
      // Never clobber a variable the runner already set: tests that need a
      // different SITE_URL or DATABASE_URL pass it on the command line.
      if (key && value && process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  })
} catch {
  // .env file not found, skip
}
