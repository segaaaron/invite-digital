import postgres from 'postgres'

// Conexión propia de esta suite, como el resto: compartir el pool deja a la otra
// escribiendo contra una conexión que ya cerró su `afterAll`.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

/** Borra los pedidos de la prueba por el nombre que usa, no todos: la base es compartida. */
export async function deleteTestOrders(customerName: string): Promise<void> {
  await sql`delete from orders where customer_name = ${customerName}`
}

export async function closePedidosDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
