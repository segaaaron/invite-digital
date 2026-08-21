import postgres from 'postgres'

// Conexión directa, no la del servidor: estas pruebas necesitan sembrar y limpiar sin
// pasar por la aplicación.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

/** Borra el evento y, por cascada, sus grupos y respuestas. Idempotente. */
export async function deleteEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
