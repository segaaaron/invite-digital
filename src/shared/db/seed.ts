import { inArray, sql } from 'drizzle-orm'
import { db } from './client'
import { CATALOG_ENTRIES, CATALOG_LISTOS } from '@/shared/design/theme-catalog'
import { eventCategories, eventCategoryTranslations, planTranslations, plans, templateTranslations, templates } from './schema'

const CATEGORIES = [
  { slug: 'boda', order: 1, es: 'Boda', en: 'Wedding' },
  { slug: 'boda-civil', order: 2, es: 'Boda civil', en: 'Civil ceremony' },
  { slug: 'xv-anos', order: 3, es: 'XV Años', en: 'Quinceañera' },
  { slug: 'despedida', order: 4, es: 'Despedida', en: 'Send-off party' },
  { slug: 'graduacion', order: 5, es: 'Graduación', en: 'Graduation' },
  { slug: 'bautizo', order: 6, es: 'Bautizo', en: 'Christening' },
  { slug: 'corporativo', order: 7, es: 'Corporativo', en: 'Corporate' },
] as const

const PLANS = [
  {
    slug: 'atelier',
    priceCents: 69000,
    highlighted: false,
    order: 1,
    // El plan de entrada: la lista de invitados va limitada y el salón es lo único
    // avanzado que trae. Mesa de regalos y modo puerta son de los planes de arriba.
    limits: { maxGuestGroups: 30, seating: true, registry: false, checkin: false },
    es: {
      name: 'Atelier',
      tagline: 'Esencia elegante',
      description: 'Una escena, tarjeta animada y RSVP simple. Entrega en 72 horas.',
      features: ['Sobre animado y sello de cera', 'Galería de 8 fotografías', 'Cuenta regresiva y mapa', 'RSVP a WhatsApp'],
    },
    en: {
      name: 'Atelier',
      tagline: 'Elegant essence',
      description: 'One scene, an animated card and simple RSVP. Delivered in 72 hours.',
      features: ['Animated envelope and wax seal', 'Eight-photograph gallery', 'Countdown and map', 'RSVP straight to WhatsApp'],
    },
  },
  {
    slug: 'firma-3d',
    priceCents: 145000,
    highlighted: true,
    order: 2,
    limits: { maxGuestGroups: 80, seating: true, registry: true, checkin: true },
    es: {
      name: 'Firma 3D',
      tagline: 'La experiencia completa',
      description: 'Unboxing 3D completo, música, panel de invitados y dominio propio por un año.',
      features: [
        'Todo lo de Atelier',
        'Apertura de sobre en 3D real',
        'Música y transiciones cinemáticas',
        'Panel de RSVP en vivo + mesas',
        'Dominio propio 12 meses',
      ],
    },
    en: {
      name: 'Signature 3D',
      tagline: 'The complete experience',
      description: 'Full 3D unboxing, music, guest panel and your own domain for a year.',
      features: [
        'Everything in Atelier',
        'True 3D envelope opening',
        'Music and cinematic transitions',
        'Live RSVP panel and seating',
        'Your own domain for 12 months',
      ],
    },
  },
  {
    slug: 'alta-costura',
    priceCents: 290000,
    highlighted: false,
    order: 3,
    // `null` es sin límite. No es cero.
    limits: { maxGuestGroups: null, seating: true, registry: true, checkin: true },
    es: {
      name: 'Alta Costura',
      tagline: 'Hecho a medida',
      description: 'Concepto original, ilustración propia y dirección de arte para la boda completa.',
      features: [
        'Todo lo de Firma 3D',
        'Monograma e ilustración a mano',
        'Save the date + agradecimiento',
        'Papelería imprimible coordinada',
        'Concierge dedicado',
      ],
    },
    en: {
      name: 'Haute Couture',
      tagline: 'Made to measure',
      description: 'Original concept, bespoke illustration and art direction for the whole wedding.',
      features: [
        'Everything in Signature 3D',
        'Hand-drawn monogram and illustration',
        'Save the date and thank-you piece',
        'Coordinated printable stationery',
        'Dedicated concierge',
      ],
    },
  },
] as const

/**
 * Las ocho plantillas de relleno que la web vendía antes de la colección de dieciséis.
 *
 * Se **despublican**, no se borran. Borrarlas rompería cualquier enlace repartido y la
 * fila no estorba a nadie; además, una plantilla es lo que un evento antiguo puede tener
 * apuntado.
 */
const PLANTILLAS_RETIRADAS = ['perla', 'marmol', 'laurel', 'carmesi', 'zafiro', 'nacarado', 'onix', 'sobre'] as const

async function seed() {
  const categoryIds = new Map<string, string>()

  for (const c of CATEGORIES) {
    const [row] = await db
      .insert(eventCategories)
      .values({ slug: c.slug, sortOrder: c.order })
      .onConflictDoUpdate({ target: eventCategories.slug, set: { sortOrder: c.order } })
      .returning({ id: eventCategories.id })
    if (!row) throw new Error(`No se pudo insertar la categoría ${c.slug}`)
    categoryIds.set(c.slug, row.id)
    await db
      .insert(eventCategoryTranslations)
      .values([
        { categoryId: row.id, locale: 'es', name: c.es },
        { categoryId: row.id, locale: 'en', name: c.en },
      ])
      .onConflictDoUpdate({
        target: [eventCategoryTranslations.categoryId, eventCategoryTranslations.locale],
        set: { name: sql`excluded.name` },
      })
  }

  for (const p of PLANS) {
    const [row] = await db
      .insert(plans)
      .values({
        slug: p.slug,
        priceCents: p.priceCents,
        currency: 'BOB',
        highlighted: p.highlighted,
        sortOrder: p.order,
        maxGuestGroups: p.limits.maxGuestGroups,
        includesSeating: p.limits.seating,
        includesRegistry: p.limits.registry,
        includesCheckin: p.limits.checkin,
      })
      // **Solo siembra lo que falta.** Precio, límites y funciones se editan desde
      // `/panel/admin/planes`, y este seed corre en cada despliegue: con el `update` de
      // antes, cada push devolvía los precios a los del código sin que nadie lo notara.
      // El `set` sobre el propio `slug` es un no-op que existe solo para que `returning`
      // devuelva la fila también cuando ya estaba.
      .onConflictDoUpdate({ target: plans.slug, set: { slug: sql`excluded.slug` } })
      .returning({ id: plans.id })
    if (!row) throw new Error(`No se pudo insertar el plan ${p.slug}`)
    await db
      .insert(planTranslations)
      .values([
        { planId: row.id, locale: 'es', ...p.es, features: [...p.es.features] },
        { planId: row.id, locale: 'en', ...p.en, features: [...p.en.features] },
      ])
      // Nombre, lema, descripción y funciones también se editan desde el panel.
      .onConflictDoNothing()
  }

  // Las dieciséis reales, leídas del catálogo de temas: el `slug` **es** la clave del
  // tema, así que la web y el motor no pueden separarse por un error de copia.
  for (const [indice, entrada] of CATALOG_LISTOS.entries()) {
    const categoryId = categoryIds.get(entrada.categorySlug)
    if (!categoryId) throw new Error(`Categoría desconocida: ${entrada.categorySlug}`)
    const orden = indice + 1
    const [row] = await db
      .insert(templates)
      .values({
        slug: entrada.key,
        themeKey: entrada.key,
        categoryId,
        coverImagePath: `/templates/${entrada.key}.avif`,
        palette: entrada.palette,
        sortOrder: orden,
        isPublished: true,
        sampleMonogram: entrada.sample.monogram,
        sampleNames: entrada.sample.names,
        sampleDateLabel: entrada.sample.dateLabel,
        sampleVenue: entrada.sample.venue,
      })
      .onConflictDoUpdate({
        target: templates.slug,
        set: {
          themeKey: entrada.key,
          categoryId,
          sortOrder: orden,
          // `isPublished` NO se toca al actualizar: el admin publica y retira modelos
          // desde `/panel/admin/modelos`, y este seed corre en cada despliegue.
          palette: entrada.palette,
          sampleMonogram: entrada.sample.monogram,
          sampleNames: entrada.sample.names,
          sampleDateLabel: entrada.sample.dateLabel,
          sampleVenue: entrada.sample.venue,
        },
      })
      .returning({ id: templates.id })
    if (!row) throw new Error(`No se pudo insertar la plantilla ${entrada.key}`)

    await db
      .insert(templateTranslations)
      .values([
        {
          templateId: row.id,
          locale: 'es',
          name: entrada.es,
          description: `Modelo ${entrada.es} de Luxury Atelier.`,
        },
        {
          templateId: row.id,
          locale: 'en',
          name: entrada.en,
          description: `The ${entrada.en} model from Luxury Atelier.`,
        },
      ])
      .onConflictDoUpdate({
        target: [templateTranslations.templateId, templateTranslations.locale],
        set: { name: sql`excluded.name`, description: sql`excluded.description` },
      })
  }

  // Las de relleno salen del escaparate, y con ellas cualquier diseño que todavía no esté
  // portado. Idempotente y sin borrar nada: una tarjeta que lleva a un 404 es peor que una
  // tarjeta que aún no está.
  const aRetirar = [
    ...PLANTILLAS_RETIRADAS,
    ...CATALOG_ENTRIES.filter((entrada) => !entrada.listo).map((entrada) => entrada.key),
  ]
  await db.update(templates).set({ isPublished: false }).where(inArray(templates.slug, aRetirar))

  console.log(
    'Seed completo: %d categorías, %d planes, %d plantillas publicadas, %d retiradas',
    CATEGORIES.length,
    PLANS.length,
    CATALOG_LISTOS.length,
    CATALOG_ENTRIES.length - CATALOG_LISTOS.length + PLANTILLAS_RETIRADAS.length,
  )
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
