/**
 * Alta del usuario del atelier. No hay registro público: este comando es la única
 * puerta. La contraseña se lee de la entrada estándar para que no quede en el historial
 * del intérprete de órdenes.
 *
 *   DATABASE_URL=… SITE_URL=… pnpm user:create atelier@invitepremium.bo
 */
import { createInterface } from 'node:readline/promises'
import { createCredential } from '@/modules/identity/domain/credential'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { drizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { isErr } from '@/shared/result'

// Función y no `await` de primer nivel: tsx compila estos guiones a CommonJS, que no
// lo admite. Mismo patrón que src/shared/db/seed.ts.
async function createAtelierUser(): Promise<number> {
  const email = process.argv[2]
  if (email === undefined) {
    console.error('Uso: pnpm user:create <correo>')
    return 1
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const password = await rl.question('Contraseña (mínimo 12 caracteres): ')
  rl.close()

  const credential = createCredential({ email, password })
  if (isErr(credential)) {
    console.error(`Rechazado — ${credential.error.detail}`)
    return 1
  }

  if (await drizzleUserRepository.findByEmail(credential.value.email)) {
    console.error(`Ya existe un usuario con el correo ${credential.value.email}`)
    return 1
  }

  const passwordHash = await argon2Hasher.hash(credential.value.password)
  const { id } = await drizzleUserRepository.create({ email: credential.value.email, passwordHash })
  console.log(`Usuario creado: ${credential.value.email} (${id})`)
  return 0
}

createAtelierUser()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
