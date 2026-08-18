import { sql } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from './client'

describe('esquema', () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL requerido para pruebas de integración')
  })

  it('tiene las tablas del catálogo', async () => {
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    )
    const names = rows.map((r) => r.table_name)
    expect(names).toContain('plans')
    expect(names).toContain('plan_translations')
    expect(names).toContain('templates')
    expect(names).toContain('template_translations')
    expect(names).toContain('consultation_requests')
  })
})
