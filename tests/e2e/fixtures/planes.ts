import postgres from 'postgres'

// Conexión propia de este archivo, como el resto de fixtures: cada uno cierra la suya en
// su `afterAll`, y el módulo es el mismo para todo el worker.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export type SeededPlanEvent = { eventId: string; planId: string }

/**
 * Un evento en un plan de prueba con el límite que se le pida. No se toca ninguno de los
 * tres planes del catálogo: bajarle el límite a `atelier` para una prueba lo dejaría
 * bajado para el resto de la suite y para la base de desarrollo.
 */
export async function seedPlanEvent(slug: string, maxGuestGroups: number): Promise<SeededPlanEvent> {
  await deletePlanEvent(slug)

  const planSlug = `e2e-${slug}`
  const [plan] = await sql<{ id: string }[]>`
    insert into plans (slug, price_cents, currency, sort_order, is_active, max_guest_groups,
                       includes_seating, includes_registry, includes_checkin)
    values (${planSlug}, 100000, 'BOB', 99, false, ${maxGuestGroups}, true, false, false)
    returning id
  `

  const [event] = await sql<{ id: string }[]>`
    -- El dueño: desde la multitenencia, un evento sin usuario solo lo ve el admin, y
    -- estas pruebas entran como el atelier. Sin esta columna la suite entera da 404.
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = 'atelier@invitepremium.bo'), ${slug}, ${`Boda ${slug}`}, '2027-06-12', '2027-06-01', 'es', 'clasico', 'live', ${plan!.id})
    returning id
  `

  return { eventId: event!.id, planId: plan!.id }
}

/** Cuántos grupos tiene el evento en la base. La pantalla puede mentir; la tabla no. */
export async function guestGroupCount(eventId: string): Promise<number> {
  const [row] = await sql<{ n: string }[]>`select count(*)::text as n from guest_groups where event_id = ${eventId}`
  return Number(row?.n ?? '0')
}

export async function deletePlanEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
  await sql`delete from plans where slug = ${`e2e-${slug}`}`
}

export async function closePlanesDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
