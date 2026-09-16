import postgres from 'postgres'

/**
 * Lo mínimo que tiene que decir una invitación para poder invitar: quién, cuándo y dónde.
 * Sin esto el panel no deja añadir, importar ni repartir, y con razón.
 */
export const INVITACION_MINIMA = {
  hero: { nameA: 'María', nameB: 'Alejandro' },
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
