import postgres from 'postgres'

/**
 * Lo mínimo para poder enviar: quién celebra y sus papás (13 oct; en boda y XV, si el diseño pinta
 * padres). Los papeles de boda y de XV a la vez, para que valga en cualquier diseño. Fecha y lugar
 * ya no se exigen, pero las suites los leen.
 */
export const INVITACION_MINIMA = {
  hero: { nameA: 'María', nameB: 'Alejandro' },
  hosts: { names: ['Luis Paz', 'Ana Ríos'], roles: { father: 'Luis Paz', mother: 'Ana Ríos', groomFather: 'Luis Paz', brideMother: 'Ana Ríos' } },
  schedule: { startsAt: '2027-05-15T20:00' },
  reception: { place: 'Salón Los Ceibos' },
} as const

/**
 * Escribe la invitación mínima en el evento **sin pisar lo que ya tenga**: lo escrito gana
 * (`nuevo || existente`). Abre y cierra su propia conexión: la comparten varias suites y un
 * `afterAll` ajeno no puede dejarla muerta.
 */
export async function escribirInvitacion(slug: string): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
  try {
    await sql`
      insert into event_content (event_id, blocks)
      select id, ${sql.json(INVITACION_MINIMA)} from events where slug = ${slug}
      on conflict (event_id) do update set blocks = excluded.blocks || event_content.blocks
    `
  } finally {
    await sql.end({ timeout: 5 })
  }
}
