import { test as teardown } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN } from './fixtures/atelier'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

/**
 * Borra el administrador de las pruebas al terminar.
 *
 * **La suite no puede dejar un admin suelto en la base.** Lo siembra porque necesita uno
 * —y no puede depender de qué rol tenga una cuenta de verdad, que se cambia desde el
 * propio panel—, pero un usuario con todos los permisos que sobrevive a la ejecución es
 * una puerta abierta con una contraseña que está escrita en el repositorio.
 *
 * Si alguna prueba le hubiera dejado eventos, el `ON DELETE RESTRICT` lo impediría: se
 * borran primero, que es exactamente la regla que se quiere.
 */
teardown('retirar el administrador de pruebas', async () => {
  await sql`delete from events where user_id = (select id from users where email = ${ADMIN.email})`
  await sql`delete from users where email = ${ADMIN.email}`
  await sql.end({ timeout: 5 })
})
