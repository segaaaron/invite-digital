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
    limits: { maxGuestGroups: 30, seating: true, registry: false, checkin: false, doorPorters: 0, cohosts: 1, hiredPlanners: 0, galleryPhotos: 8, guestPhotos: false, eventPassword: false, csvImport: false, onlineDays: 60, designChange: 'ninguno' },
    // Solo lo que el sistema entrega de verdad: nada de «3D real», dominio propio ni
    // papelería, que se prometían y no existían.
    es: {
      name: 'Atelier',
      tagline: 'Tu invitación, lista',
      description: 'Tu invitación digital con confirmación de asistencia y panel en vivo.',
      features: ['Portada con sobre animado', 'Galería de fotos', 'Cuenta regresiva, mapa e itinerario', 'Confirmación de asistencia con panel en vivo', 'Mesas y plano del salón'],
    },
    en: {
      name: 'Atelier',
      tagline: 'Your invitation, ready',
      description: 'Your digital invitation with RSVP and a live dashboard.',
      features: ['Animated envelope cover', 'Photo gallery', 'Countdown, map and itinerary', 'RSVP with a live dashboard', 'Tables and floor plan'],
    },
  },
  {
    slug: 'firma-3d',
    priceCents: 145000,
    highlighted: true,
    order: 2,
    limits: { maxGuestGroups: 80, seating: true, registry: true, checkin: true, doorPorters: 3, cohosts: 3, hiredPlanners: 1, galleryPhotos: 20, guestPhotos: true, eventPassword: true, csvImport: true, onlineDays: 180, designChange: 'antes_de_repartir' },
    es: {
      name: 'Firma 3D',
      tagline: 'Organiza todo el día',
      description: 'Invitados, mesas, regalos y la puerta con pases QR, en un solo panel.',
      features: ['Todo lo de Atelier', 'Mesa de regalos y fondos', 'Pases con QR y modo puerta sin conexión', 'Música de fondo'],
    },
    en: {
      name: 'Signature 3D',
      tagline: 'Run the whole day',
      description: 'Guests, tables, registry and the door with QR passes, in one dashboard.',
      features: ['Everything in Atelier', 'Gift registry and cash funds', 'QR passes and offline door mode', 'Background music'],
    },
  },
  {
    slug: 'alta-costura',
    priceCents: 290000,
    highlighted: false,
    order: 3,
    // `null` es sin límite. No es cero.
    limits: { maxGuestGroups: null, seating: true, registry: true, checkin: true, doorPorters: 10, cohosts: null, hiredPlanners: null, galleryPhotos: null, guestPhotos: true, eventPassword: true, csvImport: true, onlineDays: 365, designChange: 'siempre' },
    es: {
      name: 'Alta Costura',
      tagline: 'Lo hacemos contigo',
      description: 'Todo lo de Firma 3D, sin límite de invitados y con una persona asignada.',
      features: ['Todo lo de Firma 3D', 'Invitados sin límite', 'Atención de una persona asignada'],
    },
    en: {
      name: 'Haute Couture',
      tagline: 'We do it with you',
      description: 'Everything in Signature 3D, unlimited guests and a dedicated person.',
      features: ['Everything in Signature 3D', 'Unlimited guests', 'A dedicated person'],
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
        maxDoorPorters: p.limits.doorPorters,
        maxCohosts: p.limits.cohosts,
        maxHiredPlanners: p.limits.hiredPlanners,
        maxGalleryPhotos: p.limits.galleryPhotos,
        guestPhotos: p.limits.guestPhotos,
        eventPassword: p.limits.eventPassword,
        csvImport: p.limits.csvImport,
        onlineDays: p.limits.onlineDays,
        designChange: p.limits.designChange,
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
