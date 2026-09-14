import postgres from 'postgres'

/**
 * Conexión **propia** de esta suite, y no la de `fixtures/pedidos.ts`.
 *
 * Compartir el pool entre dos specs hace que el primer `afterAll` que cierre deje al otro
 * escribiendo contra una conexión muerta; el síntoma es «write CONNECTION_ENDED» en una
 * prueba que ni siquiera toca la base. Ya pasó en este proyecto, y por eso cada suite abre
 * la suya.
 */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export async function deleteOrdersOf(customerName: string): Promise<void> {
  await sql`delete from orders where customer_name = ${customerName}`
}

/**
 * Siembra un pedido con comprobante, listo para que el atelier lo apruebe.
 *
 * **No se crea por HTTP a propósito.** El alta pública tiene un límite de tres por minuto
 * y por IP —una protección de verdad, que no se toca para acomodar una prueba—, y con dos
 * suites creando pedidos el tope se agotaba y tumbaba a la vecina. Lo que esta prueba
 * ejercita empieza en la aprobación; que el formulario guarde el diseño ya lo cubren las
 * unitarias de `placeOrder`.
 */
export async function seedOrder(input: {
  publicRef: string
  customerName: string
  contact: string
  eventDate: string
  templateSlug: string
  planSlug: string
}): Promise<void> {
  const [pedido] = await sql<{ id: string }[]>`
    insert into orders (public_ref, plan_id, template_slug, customer_name, contact, event_date, status)
    values (${input.publicRef}, (select id from plans where slug = ${input.planSlug}), ${input.templateSlug},
            ${input.customerName}, ${input.contact}, ${input.eventDate}, 'proof_submitted')
    returning id
  `

  // Con comprobante: la decisión solo se ofrece sobre un pedido que lo presentó.
  await sql`
    insert into order_proofs (order_id, storage_key, original_name, mime, size_bytes)
    values (${pedido!.id}, ${crypto.randomUUID()}, 'comprobante.png', 'image/png', 128)
  `
}

/**
 * Lo que deja detrás un pedido **aprobado**: la boda que nació sola y la cuenta del
 * cliente.
 *
 * Sin esto, la segunda ejecución encuentra el evento ya creado y la aprobación responde
 * «su boda ya estaba creada»: verde por el motivo equivocado.
 *
 * El evento va primero, que se lleva por cascada la pertenencia del cliente.
 */
export async function deleteProvisioned(publicRef: string, clientEmail: string): Promise<void> {
  await sql`delete from events where slug = ${`evento-${publicRef.toLowerCase()}`}`
  await sql`delete from users where email = ${clientEmail}`
}

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
