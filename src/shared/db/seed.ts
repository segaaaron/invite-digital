import { inArray, sql } from 'drizzle-orm'
import { db } from './client'
import { CATALOG_ENTRIES, CATALOG_EN_VENTA, CATALOG_LISTOS } from '@/shared/design/theme-catalog'
import { eventCategories, eventCategoryTranslations, planTranslations, plans, templateTranslations, templates } from './schema'
import { registrarFallo } from '@/shared/observability/fallos'

const CATEGORIES = [
  { slug: 'boda', order: 1, es: 'Boda', en: 'Wedding' },
  { slug: 'boda-civil', order: 2, es: 'Boda civil', en: 'Civil ceremony' },
  { slug: 'xv-anos', order: 3, es: 'XV Años', en: 'Quinceañera' },
  { slug: 'despedida', order: 4, es: 'Despedida', en: 'Send-off party' },
  { slug: 'graduacion', order: 5, es: 'Graduación', en: 'Graduation' },
  { slug: 'bautizo', order: 6, es: 'Bautizo', en: 'Christening' },
  { slug: 'corporativo', order: 7, es: 'Corporativo', en: 'Corporate' },
  { slug: 'cumpleanos', order: 8, es: 'Cumpleaños', en: 'Birthday' },
] as const

const PLANS = [
  // Los tres del documento de cambios (30 sep), como los compone la maqueta V4: cada uno incluye
  // todo lo del anterior. Una base nueva nace así; una existente los recibe por `0089`.
  {
    slug: 'atelier',
    priceCents: 49000,
    priceUsdCents: 7040,
    highlighted: false,
    order: 1,
    limits: { maxGuestGroups: null, seating: false, registry: false, checkin: false, doorPorters: 0, cohosts: 1, hiredPlanners: 0, galleryPhotos: 5, guestPhotos: false, eventPassword: false, csvImport: false, onlineDays: 60, designChange: 'ninguno', plannerSuite: 'esencial' },
    encargo: { depositFixedCents: 10000, correctionRounds: 2, deliveryDays: 3, guestbook: false, giftWays: false, style: false },
    es: {
      name: 'Atelier',
      tagline: 'Elige tu diseño',
      description: 'Todo lo esencial de tu evento en una invitación elegante, personalizada para cada invitado.',
      features: ['Portada, cuenta regresiva, mapa y cronograma', 'Código de vestimenta y música de fondo', 'Envíos ilimitados', 'Confirmación de asistencia por WhatsApp', 'Lista de confirmados', 'Nombre del invitado + pases «Reservamos X lugares»', 'Botón para agendar en Google Calendar', 'Galería de 5 fotos', '2 rondas de corrección · entrega en 3 días', 'En línea 60 días después del evento'],
    },
    en: {
      name: 'Atelier',
      tagline: 'Choose your design',
      description: 'Everything your event needs in an elegant invitation, personalised for each guest.',
      features: ['Cover, countdown, map and schedule', 'Dress code and background music', 'Unlimited sends', 'RSVP via WhatsApp', 'Guest list of confirmations', 'Guest name + passes «We saved X seats»', 'Add to Google Calendar button', 'Gallery of 5 photos', '2 rounds of corrections · delivered in 3 days', 'Online 60 days after the event'],
    },
  },
  {
    slug: 'firma-3d',
    priceCents: 69000,
    priceUsdCents: 9914,
    highlighted: true,
    order: 2,
    limits: { maxGuestGroups: null, seating: false, registry: true, checkin: false, doorPorters: 0, cohosts: 3, hiredPlanners: 1, galleryPhotos: 10, guestPhotos: false, eventPassword: true, csvImport: false, onlineDays: 90, designChange: 'antes_de_repartir', plannerSuite: 'completo' },
    encargo: { depositFixedCents: 10000, correctionRounds: 3, deliveryDays: 3, guestbook: true, giftWays: true, style: true },
    es: {
      name: 'Gala',
      tagline: 'Hazlo tuyo',
      description: 'Suma regalos y libro de firmas para que tus invitados te dejen sus buenos deseos.',
      features: ['Lluvia de sobres y QR de transferencia', 'Libro de firmas', 'Colores y tipografías a tu gusto', 'Galería de 10 fotos', '3 rondas de corrección · entrega en 3 días', 'En línea 90 días después del evento'],
    },
    en: {
      name: 'Gala',
      tagline: 'Make it yours',
      description: 'Add gifts and a guestbook so your guests can leave you their best wishes.',
      features: ['Envelope shower and transfer QR', 'Guestbook', 'Colours and fonts of your choice', 'Gallery of 10 photos', '3 rounds of corrections · delivered in 3 days', 'Online 90 days after the event'],
    },
  },
  {
    slug: 'alta-costura',
    priceCents: 95000,
    priceUsdCents: 13649,
    highlighted: false,
    order: 3,
    // `null` es sin límite. No es cero.
    limits: { maxGuestGroups: null, seating: true, registry: true, checkin: true, doorPorters: 10, cohosts: null, hiredPlanners: null, galleryPhotos: 20, guestPhotos: true, eventPassword: true, csvImport: true, onlineDays: 180, designChange: 'siempre', plannerSuite: 'total' },
    encargo: { depositFixedCents: 10000, correctionRounds: 5, deliveryDays: 5, guestbook: true, giftWays: true, style: true },
    es: {
      name: 'Imperial',
      tagline: 'Creado para ti',
      description: 'La experiencia completa: control en tiempo real, mesas, acceso con QR y álbum compartido.',
      features: ['Panel en tiempo real: confirma, rechaza, pendiente · descargable', 'Número de mesa + QR de acceso al evento', 'Álbum compartido con QR para la fiesta', 'Galería de 20 fotos', '5 rondas de corrección · entrega en 5 días', 'En línea 6 meses después del evento'],
    },
    en: {
      name: 'Imperial',
      tagline: 'Created for you',
      description: 'The full experience: real-time control, tables, QR entry and a shared album.',
      features: ['Real-time dashboard: confirmed, declined, pending · downloadable', 'Table number + event entry QR', 'Shared album with a QR for the party', 'Gallery of 20 photos', '5 rounds of corrections · delivered in 5 days', 'Online 6 months after the event'],
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
        plannerSuite: p.limits.plannerSuite,
        priceUsdCents: p.priceUsdCents,
        depositFixedCents: p.encargo.depositFixedCents,
        correctionRounds: p.encargo.correctionRounds,
        deliveryDays: p.encargo.deliveryDays,
        includesGuestbook: p.encargo.guestbook,
        includesGiftWays: p.encargo.giftWays,
        includesStyle: p.encargo.style,
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
        // **Nace publicado salvo que el catálogo diga que no.** `cumple-beer` está portado
        // y todavía no se vende: entra retirado y solo el admin lo ve. Al actualizar no se
        // toca, así que publicarlo desde `/panel/admin/modelos` es definitivo.
        isPublished: entrada.publicar !== false,
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
    CATALOG_EN_VENTA.length,
    CATALOG_ENTRIES.length - CATALOG_EN_VENTA.length + PLANTILLAS_RETIRADAS.length,
  )
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    registrarFallo('shared/db/seed', error)
    process.exit(1)
  })
