import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'

// Conexión propia de esta suite: compartir el pool deja a la otra escribiendo contra una
// conexión que ya cerró su `afterAll`.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

/**
 * Un evento cuyo cierre de RSVP cae dentro de la ventana de recordatorio, con un grupo que
 * recibió su enlace hace días, lo abrió y no contestó.
 *
 * Las fechas se calculan **desde hoy**: la cola mira el reloj del servidor, así que una
 * fecha fija dejaría de estar en la ventana al día siguiente de escribir la prueba.
 */
export async function seedRecordatorioEvent(slug: string): Promise<{ eventId: string; token: string }> {
  await deleteRecordatorioEvent(slug)

  const [event] = await sql<{ id: string }[]>`
    insert into events (slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values (${slug}, ${`Boda ${slug}`},
            (current_date + interval '20 days')::date,
            (current_date + interval '5 days')::date,
            'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
    returning id
  `

  const token = randomBytes(16).toString('base64url')
  await sql`
    insert into guest_groups (event_id, label, seats, token_hash, phone, invitation_sent_at, opened_at)
    values (${event!.id}, 'Familia Rojas Peña', 4, ${createHash('sha256').update(token).digest()},
            '+59170011122', now() - interval '10 days', now() - interval '9 days')
  `

  return { eventId: event!.id, token }
}

export async function deleteRecordatorioEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closeRecordatorioDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
