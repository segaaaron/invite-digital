import { eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { users } from '@/shared/db/schema'
import type { UserRepository } from '../application/ports'

export const createDrizzleUserRepository = (database: DbExecutor): UserRepository => ({
  async findByEmail(email) {
    const [row] = await database
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return row ?? null
  },

  async findActor(userId) {
    const [row] = await database
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return row ?? null
  },

  async create(user) {
    const [row] = await database
      .insert(users)
      // El rol por omisión lo pone la columna: `atelier`, el de menos poder.
      .values({ email: user.email, passwordHash: user.passwordHash, ...(user.role ? { role: user.role } : {}) })
      .returning({ id: users.id })
    // `returning` siempre trae la fila insertada; si algún día no lo hiciera, el fallo
    // debe estallar aquí y no viajar como un id vacío.
    if (row === undefined) throw new Error('El alta de usuario no devolvió id')
    return row
  },
})

export const drizzleUserRepository = createDrizzleUserRepository(db)
