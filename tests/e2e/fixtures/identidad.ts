import { createHash } from 'node:crypto'
import postgres from 'postgres'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'

/** Conexión propia de esta suite: compartir el pool mata a la vecina en su `afterAll`. */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export const PROVISIONAL = {
  email: 'provisional-e2e@invitepremium.bo',
  password: 'la-que-puso-el-admin-1',
} as const

export const NUEVA_PASSWORD = 'la-que-elige-el-cliente-1'

/**
 * Una cuenta con la contraseña **provisional**, como la deja el admin al darla de alta.
 *
 * Se siembra directa en la base y no por el panel: el alta pasa por `requireAdmin` y por
 * el correo, y lo que esta suite prueba empieza después — qué le pasa a quien entra con
 * una contraseña que escribió otro.
 */
export async function seedProvisional(): Promise<void> {
  await borrar()
  await sql`
    insert into users (email, password_hash, role, must_change_password)
    values (${PROVISIONAL.email}, ${await argon2Hasher.hash(PROVISIONAL.password)}, 'atelier', true)
  `
}

/**
 * Un código de recuperación con un valor conocido.
 *
 * En la base solo vive su SHA-256 —de ahí no se saca ninguno—, así que la prueba no puede
 * «leer el código»: lo elige ella y siembra su hash, que es el mismo que calcula
 * `createTokenMinter().hashOf`. Es la única forma de recorrer el canje sin abrir un buzón.
 */
export async function seedCodigo(code: string): Promise<void> {
  const [usuario] = await sql<{ id: string }[]>`select id from users where email = ${PROVISIONAL.email}`
  if (usuario === undefined) throw new Error('siembra primero la cuenta')

  await sql`delete from password_resets where user_id = ${usuario.id}`
  await sql`
    insert into password_resets (user_id, code_hash, expires_at)
    values (${usuario.id}, ${createHash('sha256').update(code).digest()}, now() + interval '10 minutes')
  `
}

/** Cómo quedó la marca: es lo que decide si el panel se abre o no. */
export async function debeCambiarla(): Promise<boolean> {
  const [fila] = await sql<{ must: boolean }[]>`
    select must_change_password as must from users where email = ${PROVISIONAL.email}
  `
  return fila?.must ?? false
}

export async function borrar(): Promise<void> {
  await sql`delete from users where email = ${PROVISIONAL.email}`
}

export async function cerrarDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
