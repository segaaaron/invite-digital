/**
 * Datos de demostración: un evento completo con invitados, personas, mesas, regalos y
 * mensajes.
 *
 * **Va aparte de `pnpm db:seed` a propósito.** Aquel siembra el catálogo —categorías,
 * planes y plantillas—, que es dato real y se corre también en producción. Esto es
 * relleno: una boda inventada para ver el panel con algo dentro. Mezclarlos metería a
 * María y Alejandro en la base de un atelier de verdad.
 *
 * Es idempotente por la vía corta: borra el evento por su `slug` y lo vuelve a crear. El
 * `on delete cascade` se lleva grupos, personas, respuestas, mesas y regalos con él.
 *
 * Los tokens son **deterministas**, para que los enlaces de la demo sobrevivan a volver a
 * sembrar y se puedan dejar apuntados. Por eso mismo son adivinables, y por eso el
 * script se niega a correr con `NODE_ENV=production`.
 */
import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '../src/shared/db/client'

const SLUG = 'demo-boda'

/** Token estable a partir de la etiqueta. Ver la nota de arriba: no es un secreto. */
function tokenDe(etiqueta: string): string {
  return createHash('sha256').update(`demo:${SLUG}:${etiqueta}`).digest('base64url').slice(0, 22)
}

type Persona = {
  nombre: string
  acompanante?: boolean
  vip?: boolean
  dieta?: string
  correo?: string
  asiste?: 'yes' | 'no' | 'maybe'
}

type Grupo = {
  etiqueta: string
  cupos: number
  telefono?: string
  mesa?: string
  /** Cuántos confirmaron. `null` = todavía no ha contestado. */
  confirman: number | null
  mensaje?: string
  personas: readonly Persona[]
}

const GRUPOS: readonly Grupo[] = [
  {
    etiqueta: 'Familia Rojas Peña',
    cupos: 4,
    telefono: '+59170011122',
    mesa: 'Mesa 01',
    confirman: 4,
    mensaje: 'Qué alegría acompañarlos. Vamos los cuatro, y llevamos la cámara de siempre.',
    personas: [
      { nombre: 'Jorge Rojas', vip: true, correo: 'jorge.rojas@example.com', asiste: 'yes' },
      { nombre: 'Lucía Peña', correo: 'lucia.pena@example.com', asiste: 'yes' },
      { nombre: 'Martín Rojas Peña', dieta: 'Sin gluten', asiste: 'yes' },
      { nombre: 'Emilia Rojas Peña', acompanante: true, dieta: 'Vegetariana', asiste: 'yes' },
    ],
  },
  {
    etiqueta: 'Ana Lucía Vega',
    cupos: 2,
    telefono: '+59171122334',
    mesa: 'Mesa 01',
    confirman: 2,
    mensaje: 'Ahí estaremos. Gracias por pensar en nosotros.',
    personas: [
      { nombre: 'Ana Lucía Vega', vip: true, correo: 'ana.vega@example.com', asiste: 'yes' },
      { nombre: 'Diego Salinas', acompanante: true, dieta: 'sin  gluten', asiste: 'yes' },
    ],
  },
  {
    etiqueta: 'Padrinos Molina',
    cupos: 2,
    telefono: '+59172233445',
    mesa: 'Mesa 02',
    confirman: 2,
    mensaje: 'No nos lo perderíamos por nada. Un abrazo enorme a los dos.',
    personas: [
      { nombre: 'Ricardo Molina', vip: true, correo: 'ricardo.molina@example.com', asiste: 'yes' },
      { nombre: 'Teresa Camacho de Molina', vip: true, asiste: 'yes' },
    ],
  },
  {
    etiqueta: 'Familia Arce',
    cupos: 5,
    telefono: '+59173344556',
    mesa: 'Mesa 02',
    confirman: 3,
    mensaje: 'Vamos tres: los abuelos ya no viajan de noche. Los queremos mucho.',
    personas: [
      { nombre: 'Pablo Arce', correo: 'pablo.arce@example.com', asiste: 'yes' },
      { nombre: 'Rosario Vargas de Arce', dieta: 'Diabética', asiste: 'yes' },
      { nombre: 'Camila Arce Vargas', asiste: 'yes' },
      { nombre: 'Don Hugo Arce', asiste: 'no' },
      { nombre: 'Doña Elsa de Arce', asiste: 'no' },
    ],
  },
  {
    etiqueta: 'Compañeros de la oficina',
    cupos: 6,
    telefono: '+59174455667',
    mesa: 'Mesa 03',
    confirman: 4,
    mensaje: 'Confirmamos cuatro. ¡Preparen la pista!',
    personas: [
      { nombre: 'Sofía Balderrama', correo: 'sofia.b@example.com', asiste: 'yes' },
      { nombre: 'Iván Cuéllar', dieta: 'Vegana', asiste: 'yes' },
      { nombre: 'Natalia Ríos', asiste: 'yes' },
      { nombre: 'Gonzalo Terceros', asiste: 'yes' },
      { nombre: 'Fernanda Loayza', asiste: 'maybe' },
      { nombre: 'Álvaro Michel', asiste: 'no' },
    ],
  },
  {
    etiqueta: 'Tíos de Cochabamba',
    cupos: 3,
    telefono: '+59175566778',
    confirman: null,
    personas: [
      { nombre: 'Marcelo Antezana', correo: 'marcelo.a@example.com' },
      { nombre: 'Silvia Zeballos' },
      { nombre: 'Joaquín Antezana Zeballos', acompanante: true },
    ],
  },
  {
    etiqueta: 'Familia Guzmán',
    cupos: 4,
    confirman: 0,
    mensaje: 'Nos duele muchísimo, pero estamos de viaje esa semana. Todo lo bueno para ustedes.',
    personas: [
      { nombre: 'Andrés Guzmán', asiste: 'no' },
      { nombre: 'Paola Ferrufino', asiste: 'no' },
    ],
  },
  {
    etiqueta: 'Amigos del colegio',
    cupos: 4,
    telefono: '+59176677889',
    mesa: 'Mesa 03',
    confirman: 2,
    personas: [
      { nombre: 'Rodrigo Áñez', asiste: 'yes' },
      { nombre: 'Valeria Suárez', dieta: 'Alergia a los frutos secos', asiste: 'yes' },
      { nombre: 'Mauricio Landívar', asiste: 'maybe' },
    ],
  },
]

const MESAS = [
  { label: 'Mesa 01', capacity: 8, shape: 'round', x: '30', y: '35', notes: 'Cerca de los novios' },
  { label: 'Mesa 02', capacity: 8, shape: 'round', x: '55', y: '35', notes: null },
  { label: 'Mesa 03', capacity: 10, shape: 'rect', x: '42', y: '62', notes: 'Acceso para silla de ruedas' },
  { label: 'Mesa 04', capacity: 8, shape: 'round', x: '72', y: '58', notes: null },
] as const

const ZONAS = [
  { kind: 'dance', label: 'Pista de baile', x: '42', y: '80', w: '26', h: '14' },
  { kind: 'bar', label: 'Barra', x: '82', y: '30', w: '12', h: '22' },
  { kind: 'entrance', label: 'Ingreso', x: '6', y: '78', w: '14', h: '10' },
] as const

const REGALOS = [
  { name: 'Juego de sábanas de lino', priceCents: 78000, store: 'Casa Bonita', url: 'https://example.com/sabanas' },
  { name: 'Cafetera espresso', priceCents: 195000, store: 'Electro Sur', url: 'https://example.com/cafetera' },
  { name: 'Vajilla para doce', priceCents: 240000, store: 'Casa Bonita', url: null },
  { name: 'Set de copas de cristal', priceCents: 62000, store: null, url: null },
  { name: 'Olla de hierro fundido', priceCents: 128000, store: 'Electro Sur', url: 'https://example.com/olla' },
] as const

async function seedDemo() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El sembrador de demostración no se corre en producción: sus tokens son adivinables.')
  }

  const [dueno] = await db.execute<{ id: string }>(sql`select id from users order by created_at asc limit 1`)
  if (!dueno) {
    throw new Error('No hay ningún usuario: crea uno con `pnpm user:create` antes de sembrar la demo.')
  }

  await db.execute(sql`delete from events where slug = ${SLUG}`)

  const [evento] = await db.execute<{ id: string }>(sql`
    -- El dueño es el usuario más antiguo. Un evento sin usuario solo lo ve el admin, y
    -- la demo existe para que cualquiera vea el panel con algo dentro.
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, venue, currency,
                        message_template, plan_id)
    values ((select id from users order by created_at asc limit 1),
            ${SLUG}, 'María & Alejandro', '2026-10-12', '2026-09-28', 'es', 'perla', 'live',
            'Jardín Botánico Luna', 'BOB',
            'Hola {grupo}, les compartimos nuestra invitación: {enlace}',
            (select id from plans where slug = 'alta-costura'))
    returning id
  `)
  if (!evento) throw new Error('No se pudo crear el evento de demostración')
  const eventId = evento.id

  const mesaIds = new Map<string, string>()
  for (const mesa of MESAS) {
    const [fila] = await db.execute<{ id: string }>(sql`
      insert into venue_tables (event_id, label, capacity, shape, notes, x, y)
      values (${eventId}, ${mesa.label}, ${mesa.capacity}, ${mesa.shape}, ${mesa.notes}, ${mesa.x}, ${mesa.y})
      returning id
    `)
    if (!fila) throw new Error(`No se pudo crear ${mesa.label}`)
    mesaIds.set(mesa.label, fila.id)
  }

  for (const zona of ZONAS) {
    await db.execute(sql`
      insert into venue_zones (event_id, kind, label, x, y, w, h)
      values (${eventId}, ${zona.kind}, ${zona.label}, ${zona.x}, ${zona.y}, ${zona.w}, ${zona.h})
    `)
  }

  const enlaces: { grupo: string; token: string }[] = []
  const grupoIds: string[] = []

  for (const grupo of GRUPOS) {
    const token = tokenDe(grupo.etiqueta)
    const hash = createHash('sha256').update(token).digest()
    const mesaId = grupo.mesa === undefined ? null : (mesaIds.get(grupo.mesa) ?? null)

    const [fila] = await db.execute<{ id: string }>(sql`
      insert into guest_groups (event_id, label, seats, token_hash, phone, table_id, invitation_sent_at, opened_at)
      values (${eventId}, ${grupo.etiqueta}, ${grupo.cupos}, ${hash}, ${grupo.telefono ?? null}, ${mesaId},
              now() - interval '9 days',
              ${grupo.confirman === null ? null : sql`now() - interval '7 days'`})
      returning id
    `)
    if (!fila) throw new Error(`No se pudo crear el grupo ${grupo.etiqueta}`)
    grupoIds.push(fila.id)
    enlaces.push({ grupo: grupo.etiqueta, token })

    for (const persona of grupo.personas) {
      await db.execute(sql`
        insert into guest_people (guest_group_id, full_name, is_companion, dietary_note, vip, email, attending)
        values (${fila.id}, ${persona.nombre}, ${persona.acompanante ?? false}, ${persona.dieta ?? null},
                ${persona.vip ?? false}, ${persona.correo ?? null}, ${persona.asiste ?? null})
      `)
    }

    if (grupo.confirman !== null) {
      const [respuesta] = await db.execute<{ id: string }>(sql`
        insert into rsvp_responses (guest_group_id, attending, message, responded_at)
        values (${fila.id}, ${grupo.confirman}, ${grupo.mensaje ?? null}, now() - interval '6 days')
        returning id
      `)
      // Dos mensajes leídos y uno destacado, para que la bandeja no nazca toda en blanco.
      if (respuesta && grupo.mensaje !== undefined && grupo.etiqueta === 'Padrinos Molina') {
        await db.execute(sql`
          insert into message_notes (rsvp_response_id, read_at, featured_at)
          values (${respuesta.id}, now() - interval '5 days', now() - interval '5 days')
        `)
      } else if (respuesta && grupo.etiqueta === 'Familia Rojas Peña') {
        await db.execute(sql`
          insert into message_notes (rsvp_response_id, read_at, reply, replied_at)
          values (${respuesta.id}, now() - interval '5 days', 'Gracias, Jorge. Nos vemos el 12.',
                  now() - interval '4 days')
        `)
      }
    }
  }

  for (const [indice, regalo] of REGALOS.entries()) {
    // El segundo y el tercero ya tienen dueño: la mesa de regalos vacía no enseña ni el
    // estado reservado ni el comprado, que es la mitad de la pantalla.
    const estado = indice === 1 ? 'reserved' : indice === 2 ? 'purchased' : 'available'
    const dueno = estado === 'available' ? null : (grupoIds[indice] ?? null)
    await db.execute(sql`
      insert into gifts (event_id, name, price_cents, store, url, status, claimed_by_group_id, claimed_at)
      values (${eventId}, ${regalo.name}, ${regalo.priceCents}, ${regalo.store}, ${regalo.url}, ${estado}, ${dueno},
              ${dueno === null ? null : sql`now() - interval '3 days'`})
    `)
  }

  const [fondo] = await db.execute<{ id: string }>(sql`
    insert into gift_funds (event_id, name, description, goal_cents)
    values (${eventId}, 'Luna de miel en Rurrenabaque', 'Tres noches de selva, que es lo que soñamos desde el año pasado.', 700000)
    returning id
  `)
  if (fondo) {
    await db.execute(sql`
      insert into fund_contributions (fund_id, guest_group_id, display_name, amount_cents, method, message)
      values (${fondo.id}, ${grupoIds[2] ?? null}, 'Padrinos Molina', 150000, 'transfer', 'Para el primer día allá.'),
             (${fondo.id}, ${grupoIds[0] ?? null}, 'Familia Rojas Peña', 80000, 'transfer', null),
             (${fondo.id}, null, 'Abuela Yolanda', 50000, 'envelope', 'De parte de la abuela.')
    `)
  }

  const personas = GRUPOS.reduce((suma, g) => suma + g.personas.length, 0)
  console.log('Demo sembrada: evento «%s», %d grupos, %d personas.', SLUG, GRUPOS.length, personas)
  console.log('Panel:      /panel/eventos/%s', SLUG)
  console.log('Invitados:  %s', enlaces.map((e) => `${e.grupo} → /i/${e.token}`).join('\n            '))
}

seedDemo()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
