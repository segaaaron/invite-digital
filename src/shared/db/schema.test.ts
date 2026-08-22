import { eq, sql } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from './client'
import {
  arrivals,
  eventCategories,
  fundContributions,
  gifts,
  guestGroups,
  plans,
  templates,
  venueTables,
  venueZones,
} from './schema'

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

  it('los tres planes existen con su price_cents exacto y currency BOB', async () => {
    const rows = await db
      .select({ slug: plans.slug, priceCents: plans.priceCents, currency: plans.currency })
      .from(plans)
      .orderBy(plans.sortOrder)
    if (rows.length === 0) throw new Error('No hay planes en la base — ¿corriste `pnpm db:seed`?')
    expect(rows).toEqual([
      { slug: 'atelier', priceCents: 69000, currency: 'BOB' },
      { slug: 'firma-3d', priceCents: 145000, currency: 'BOB' },
      { slug: 'alta-costura', priceCents: 290000, currency: 'BOB' },
    ])
  })

  it('exactamente un plan está destacado y es firma-3d', async () => {
    const allPlans = await db.select({ slug: plans.slug }).from(plans)
    if (allPlans.length === 0) throw new Error('No hay planes en la base — ¿corriste `pnpm db:seed`?')
    const highlighted = await db.select({ slug: plans.slug }).from(plans).where(eq(plans.highlighted, true))
    expect(highlighted).toEqual([{ slug: 'firma-3d' }])
  })

  it('las 8 plantillas están publicadas, ordenadas y apuntan a una categoría existente', async () => {
    const rows = await db
      .select({
        slug: templates.slug,
        sortOrder: templates.sortOrder,
        isPublished: templates.isPublished,
        categorySlug: eventCategories.slug,
      })
      .from(templates)
      .innerJoin(eventCategories, eq(templates.categoryId, eventCategories.id))
      .orderBy(templates.sortOrder)
    if (rows.length === 0) throw new Error('No hay plantillas en la base — ¿corriste `pnpm db:seed`?')

    expect(rows.map((r) => r.slug)).toEqual(['perla', 'marmol', 'laurel', 'carmesi', 'zafiro', 'nacarado', 'onix', 'sobre'])
    expect(rows.map((r) => r.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(rows.every((r) => r.isPublished)).toBe(true)
    // El inner join contra event_categories ya exige que category_id resuelva a una fila real;
    // esta aserción confirma además que el slug resultante no está vacío.
    expect(rows.every((r) => r.categorySlug.length > 0)).toBe(true)
  })

  it('cada plan, categoría y plantilla tiene traducciones es y en con texto no vacío', async () => {
    const [planCountRow] = await db.execute<{ count: string }>(sql`select count(*)::text as count from plans`)
    if (!planCountRow || planCountRow.count === '0') throw new Error('No hay planes en la base — ¿corriste `pnpm db:seed`?')

    const missing = await db.execute<{ entity: string; slug: string; locale: string }>(sql`
      with locales(locale) as (values ('es'), ('en'))
      select 'plan' as entity, p.slug, l.locale
      from plans p
      cross join locales l
      left join plan_translations pt on pt.plan_id = p.id and pt.locale = l.locale
      where pt.plan_id is null or trim(pt.name) = '' or trim(pt.tagline) = '' or trim(pt.description) = ''

      union all

      select 'category' as entity, c.slug, l.locale
      from event_categories c
      cross join locales l
      left join event_category_translations ct on ct.category_id = c.id and ct.locale = l.locale
      where ct.category_id is null or trim(ct.name) = ''

      union all

      select 'template' as entity, t.slug, l.locale
      from templates t
      cross join locales l
      left join template_translations tt on tt.template_id = t.id and tt.locale = l.locale
      where tt.template_id is null or trim(tt.name) = '' or trim(tt.description) = ''

      order by entity, slug, locale
    `)

    expect(missing).toEqual([])
  })

  it('price_cents es un entero (no numeric/float)', async () => {
    const rows = await db.execute<{ data_type: string }>(sql`
      select data_type
      from information_schema.columns
      where table_schema = 'public' and table_name = 'plans' and column_name = 'price_cents'
    `)
    expect(rows).toEqual([{ data_type: 'integer' }])
  })

  it('las tablas de traducciones tienen clave primaria compuesta (entidad_id, locale)', async () => {
    async function primaryKeyColumns(table: string) {
      const rows = await db.execute<{ column_name: string }>(sql`
        select kcu.column_name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
        where tc.table_schema = 'public' and tc.table_name = ${table} and tc.constraint_type = 'PRIMARY KEY'
        order by kcu.ordinal_position
      `)
      return rows.map((r) => r.column_name)
    }

    await expect(primaryKeyColumns('plan_translations')).resolves.toEqual(['plan_id', 'locale'])
    await expect(primaryKeyColumns('event_category_translations')).resolves.toEqual(['category_id', 'locale'])
    await expect(primaryKeyColumns('template_translations')).resolves.toEqual(['template_id', 'locale'])
  })

  it('el trigger de base de datos refresca updated_at en cada UPDATE de plans', async () => {
    class RollbackForTest extends Error {}

    let before: Date | undefined
    let after: Date | undefined

    try {
      await db.transaction(async (tx) => {
        const [beforeRow] = await tx.select({ updatedAt: plans.updatedAt }).from(plans).where(eq(plans.slug, 'atelier'))
        if (!beforeRow) throw new Error('El plan "atelier" no existe — ¿corriste `pnpm db:seed`?')
        before = beforeRow.updatedAt

        // UPDATE que no toca updated_at explícitamente: si algo cambia, es obra del trigger.
        await tx.update(plans).set({ sortOrder: sql`sort_order` }).where(eq(plans.slug, 'atelier'))

        const [afterRow] = await tx.select({ updatedAt: plans.updatedAt }).from(plans).where(eq(plans.slug, 'atelier'))
        after = afterRow?.updatedAt

        // Revertimos siempre: esta prueba no debe dejar residuo en la base.
        throw new RollbackForTest()
      })
    } catch (error) {
      if (!(error instanceof RollbackForTest)) throw error
    }

    if (!before || !after) throw new Error('No se pudieron leer los timestamps del plan "atelier"')
    expect(after.getTime()).toBeGreaterThan(before.getTime())
  })
})

describe('arrivals', () => {
  it('guarda la clave de idempotencia del escaneo', () => {
    expect(arrivals.scanId.notNull).toBe(true)
    expect(arrivals.scanId.isUnique).toBe(true)
  })

  it('deshacer es una lápida, no un borrado', () => {
    expect(arrivals.voidedAt.notNull).toBe(false)
  })

  it('separa la hora del dispositivo de la del servidor', () => {
    expect(arrivals.scannedAt.notNull).toBe(true)
    expect(arrivals.receivedAt.notNull).toBe(true)
  })
})

describe('venue', () => {
  it('la mesa exige cupo y etiqueta', () => {
    expect(venueTables.capacity.notNull).toBe(true)
    expect(venueTables.label.notNull).toBe(true)
  })

  it('borrar la mesa deja al grupo sin mesa, no lo borra', () => {
    // table_id es anulable: ON DELETE SET NULL
    expect(guestGroups.tableId.notNull).toBe(false)
  })

  it('la zona guarda posición y tamaño', () => {
    for (const c of [venueZones.x, venueZones.y, venueZones.w, venueZones.h]) {
      expect(c.notNull).toBe(true)
    }
  })

  it('la etiqueta de la mesa es única dentro del evento, no en toda la base', async () => {
    const rows = await db.execute<{ indexdef: string }>(
      sql`select indexdef from pg_indexes where tablename = 'venue_tables' and indexname = 'venue_tables_label_unique'`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.indexdef).toContain('UNIQUE')
    expect(rows[0]?.indexdef).toMatch(/event_id.*label/)
  })

  it('el cupo de la mesa no puede ser cero: lo impide la base', async () => {
    const rows = await db.execute<{ conname: string }>(
      sql`select conname from pg_constraint where conrelid = 'venue_tables'::regclass and contype = 'c'`,
    )
    expect(rows.map((r) => r.conname)).toContain('venue_tables_capacity_positive')
  })
})

describe('mesa de regalos', () => {
  it('el precio del regalo es un entero en centavos y no puede faltar', () => {
    expect(gifts.priceCents.notNull).toBe(true)
    expect(gifts.priceCents.dataType).toBe('number')
  })

  it('un regalo puede no estar reservado por nadie', () => {
    expect(gifts.claimedByGroupId.notNull).toBe(false)
    expect(gifts.claimedAt.notNull).toBe(false)
  })

  it('el importe de la contribución es un entero en centavos', () => {
    expect(fundContributions.amountCents.notNull).toBe(true)
    expect(fundContributions.amountCents.dataType).toBe('number')
  })

  it('la abuela del sobre no tiene grupo: guest_group_id es anulable', () => {
    expect(fundContributions.guestGroupId.notNull).toBe(false)
    // Su nombre, en cambio, sí hace falta: un importe sin remitente no se agradece.
    expect(fundContributions.displayName.notNull).toBe(true)
  })

  it('los importes en la base son integer, no numeric ni float', async () => {
    const rows = await db.execute<{ table_name: string; column_name: string; data_type: string }>(sql`
      select table_name, column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and (table_name, column_name) in (
          ('gifts', 'price_cents'), ('gift_funds', 'goal_cents'), ('fund_contributions', 'amount_cents')
        )
      order by table_name, column_name
    `)
    expect(rows.map((r) => r.data_type)).toEqual(['integer', 'integer', 'integer'])
  })

  it('la base impide importes de cero o negativos', async () => {
    const rows = await db.execute<{ conname: string }>(sql`
      select conname from pg_constraint
      where contype = 'c'
        and conrelid in ('gifts'::regclass, 'gift_funds'::regclass, 'fund_contributions'::regclass)
    `)
    const names = rows.map((r) => r.conname)
    expect(names).toContain('gifts_price_positive')
    expect(names).toContain('gift_funds_goal_positive')
    expect(names).toContain('fund_contributions_amount_positive')
  })

  it('borrar un grupo no borra el regalo de la lista: SET NULL, no CASCADE', async () => {
    const rows = await db.execute<{ delete_rule: string }>(sql`
      select rc.delete_rule
      from information_schema.referential_constraints rc
      join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name
      where kcu.table_name = 'gifts' and kcu.column_name = 'claimed_by_group_id'
    `)
    expect(rows.map((r) => r.delete_rule)).toEqual(['SET NULL'])
  })

  it('borrar el fondo arrastra sus contribuciones', async () => {
    const rows = await db.execute<{ delete_rule: string }>(sql`
      select rc.delete_rule
      from information_schema.referential_constraints rc
      join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name
      where kcu.table_name = 'fund_contributions' and kcu.column_name = 'fund_id'
    `)
    expect(rows.map((r) => r.delete_rule)).toEqual(['CASCADE'])
  })
})
