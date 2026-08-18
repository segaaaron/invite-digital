import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env file for tests
const envPath = resolve(process.cwd(), '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')
      if (key && value) {
        process.env[key] = value
      }
    }
  })
} catch {
  // .env file not found, skip
}
