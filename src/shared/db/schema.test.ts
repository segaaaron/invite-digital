import { eq, sql } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { CATALOG_LISTOS } from '@/shared/design/theme-catalog'
import { db } from './client'
import {
  arrivals,
  eventCategories,
  events,
  fundContributions,
  gifts,
  guestGroups,
  messageNotes,
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

  it('las plantillas publicadas son las de la colección, ordenadas y con categoría real', async () => {
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

    // Las ocho de relleno siguen en la tabla pero **despublicadas**: borrarlas rompería
    // cualquier enlace repartido, y una plantilla es lo que un evento antiguo puede tener
    // apuntado. Lo que se enseña son los diseños de la colección que ya están portados.
    const publicadas = rows.filter((r) => r.isPublished)
    const esperadas = CATALOG_LISTOS.map((entrada) => entrada.key)
    expect(publicadas.map((r) => r.slug).sort()).toEqual([...esperadas].sort())
    expect(publicadas.map((r) => r.sortOrder)).toEqual(esperadas.map((_, indice) => indice + 1))
    for (const retirada of ['perla', 'marmol', 'laurel', 'carmesi', 'zafiro', 'nacarado', 'onix', 'sobre']) {
      expect(rows.find((r) => r.slug === retirada)?.isPublished, retirada).toBe(false)
    }
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

describe('libro de firmas', () => {
  it('una nota por mensaje: rsvp_response_id es obligatorio y único', () => {
    expect(messageNotes.rsvpResponseId.notNull).toBe(true)
    expect(messageNotes.rsvpResponseId.isUnique).toBe(true)
  })

  it('leído, destacado y respuesta nacen vacíos: los cuatro son anulables', () => {
    expect(messageNotes.readAt.notNull).toBe(false)
    expect(messageNotes.featuredAt.notNull).toBe(false)
    expect(messageNotes.reply.notNull).toBe(false)
    expect(messageNotes.repliedAt.notNull).toBe(false)
  })

  it('la nota NO guarda el cuerpo del mensaje: ese texto vive en rsvp_responses', () => {
    // Dos columnas con el mismo texto son dos versiones que se desincronizan en cuanto
    // alguien edita una. Aquí solo vive el estado editable.
    const columnas = Object.keys(messageNotes)
    expect(columnas).not.toContain('body')
    expect(columnas).not.toContain('message')
    expect(columnas).not.toContain('text')
  })

  it('en la base tampoco hay ninguna columna con el cuerpo del mensaje', async () => {
    const rows = await db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'message_notes'`,
    )
    expect(rows.map((r) => r.column_name).sort()).toEqual([
      'featured_at',
      'id',
      'read_at',
      'replied_at',
      'reply',
      'rsvp_response_id',
    ])
  })

  it('borrar la respuesta de RSVP se lleva su nota por cascada', async () => {
    const rows = await db.execute<{ delete_rule: string }>(sql`
      select rc.delete_rule
      from information_schema.referential_constraints rc
      join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name
      where kcu.table_name = 'message_notes' and kcu.column_name = 'rsvp_response_id'
    `)
    expect(rows.map((r) => r.delete_rule)).toEqual(['CASCADE'])
  })

  it('el índice de destacados es parcial: solo indexa lo destacado', async () => {
    const rows = await db.execute<{ indexdef: string }>(
      sql`select indexdef from pg_indexes where tablename = 'message_notes' and indexname = 'message_notes_featured_idx'`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.indexdef).toContain('WHERE')
  })
})

describe('límites del plan', () => {
  it('max_guest_groups es anulable: nulo significa sin límite, no cero', () => {
    // Un `NOT NULL DEFAULT 0` sería el error caro: el plan más caro, que no limita nada,
    // quedaría con límite cero y no admitiría ni un grupo.
    expect(plans.maxGuestGroups.notNull).toBe(false)
  })

  it('las tres banderas de funciones incluidas son obligatorias', () => {
    // Anulables obligarían a decidir en cada lectura qué significa el nulo, y esa
    // decisión acabaría escrita de forma distinta en cada módulo que la consulta.
    expect(plans.includesSeating.notNull).toBe(true)
    expect(plans.includesRegistry.notNull).toBe(true)
    expect(plans.includesCheckin.notNull).toBe(true)
  })

  it('events.plan_id es anulable: los eventos anteriores a esta rebanada no tienen plan', () => {
    expect(events.planId.notNull).toBe(false)
  })

  it('la migración entra sin quitarle nada a lo que ya existía: los tres includes_* por defecto en true', async () => {
    const rows = await db.execute<{ column_name: string; column_default: string | null }>(sql`
      select column_name, column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'plans'
        and column_name in ('includes_seating', 'includes_registry', 'includes_checkin')
    `)
    expect(rows).toHaveLength(3)
    for (const row of rows) expect(row.column_default).toBe('true')
  })

  it('borrar un plan no borra los eventos que lo usaban: SET NULL, no CASCADE', async () => {
    const rows = await db.execute<{ delete_rule: string }>(sql`
      select rc.delete_rule
      from information_schema.referential_constraints rc
      join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name
      where kcu.table_name = 'events' and kcu.column_name = 'plan_id'
    `)
    expect(rows.map((r) => r.delete_rule)).toEqual(['SET NULL'])
  })

  it('el seed asigna los límites reales de cada plan', async () => {
    const rows = await db
      .select({
        slug: plans.slug,
        maxGuestGroups: plans.maxGuestGroups,
        seating: plans.includesSeating,
        registry: plans.includesRegistry,
        checkin: plans.includesCheckin,
      })
      .from(plans)
      .orderBy(plans.sortOrder)

    expect(rows).toEqual([
      { slug: 'atelier', maxGuestGroups: 30, seating: true, registry: false, checkin: false },
      { slug: 'firma-3d', maxGuestGroups: 80, seating: true, registry: true, checkin: true },
      { slug: 'alta-costura', maxGuestGroups: null, seating: true, registry: true, checkin: true },
    ])
  })

  it('la tabla de solicitudes de cambio existe', async () => {
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    )
    expect(rows.map((r) => r.table_name)).toContain('plan_change_requests')
  })

  it('solo puede haber una solicitud pendiente por evento: el índice es parcial', async () => {
    const rows = await db.execute<{ indexdef: string }>(
      sql`select indexdef from pg_indexes where tablename = 'plan_change_requests' and indexname = 'plan_change_pending_idx'`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.indexdef).toContain('WHERE')
    expect(rows[0]?.indexdef).toContain('UNIQUE')
  })
})
