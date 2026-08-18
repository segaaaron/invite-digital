import { db } from './client'
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

const TEMPLATES = [
  { slug: 'perla', category: 'boda', order: 1, palette: { base: '#fdfaf4', accent: '#c19b4a' }, es: 'Perla', en: 'Pearl' },
  { slug: 'marmol', category: 'boda', order: 2, palette: { base: '#f4f1ec', accent: '#8d7a52' }, es: 'Mármol', en: 'Marble' },
  { slug: 'laurel', category: 'boda-civil', order: 3, palette: { base: '#f2f4ef', accent: '#5f7350' }, es: 'Laurel', en: 'Laurel' },
  { slug: 'carmesi', category: 'boda', order: 4, palette: { base: '#f7efec', accent: '#b3775f' }, es: 'Carmesí', en: 'Crimson' },
  { slug: 'zafiro', category: 'xv-anos', order: 5, palette: { base: '#eef1f6', accent: '#7b8ea8' }, es: 'Zafiro', en: 'Sapphire' },
  { slug: 'nacarado', category: 'xv-anos', order: 6, palette: { base: '#fbf6f2', accent: '#d7c08a' }, es: 'Nacarado', en: 'Nacre' },
  { slug: 'onix', category: 'corporativo', order: 7, palette: { base: '#eceae7', accent: '#4a443c' }, es: 'Ónix', en: 'Onyx' },
  { slug: 'sobre', category: 'bautizo', order: 8, palette: { base: '#fbf9f4', accent: '#eed8a4' }, es: 'Sobre', en: 'Envelope' },
] as const

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
      .onConflictDoNothing()
  }

  for (const p of PLANS) {
    const [row] = await db
      .insert(plans)
      .values({ slug: p.slug, priceCents: p.priceCents, currency: 'BOB', highlighted: p.highlighted, sortOrder: p.order })
      .onConflictDoUpdate({ target: plans.slug, set: { priceCents: p.priceCents, highlighted: p.highlighted, sortOrder: p.order } })
      .returning({ id: plans.id })
    if (!row) throw new Error(`No se pudo insertar el plan ${p.slug}`)
    await db
      .insert(planTranslations)
      .values([
        { planId: row.id, locale: 'es', ...p.es, features: [...p.es.features] },
        { planId: row.id, locale: 'en', ...p.en, features: [...p.en.features] },
      ])
      .onConflictDoNothing()
  }

  for (const t of TEMPLATES) {
    const categoryId = categoryIds.get(t.category)
    if (!categoryId) throw new Error(`Categoría desconocida: ${t.category}`)
    const [row] = await db
      .insert(templates)
      .values({ slug: t.slug, categoryId, coverImagePath: `/templates/${t.slug}.avif`, palette: t.palette, sortOrder: t.order })
      .onConflictDoUpdate({ target: templates.slug, set: { categoryId, sortOrder: t.order, palette: t.palette } })
      .returning({ id: templates.id })
    if (!row) throw new Error(`No se pudo insertar la plantilla ${t.slug}`)
    await db
      .insert(templateTranslations)
      .values([
        { templateId: row.id, locale: 'es', name: t.es, description: `Modelo ${t.es} del atelier InvitePremium.` },
        { templateId: row.id, locale: 'en', name: t.en, description: `The ${t.en} model from the InvitePremium atelier.` },
      ])
      .onConflictDoNothing()
  }

  console.log('Seed completo: %d categorías, %d planes, %d plantillas', CATEGORIES.length, PLANS.length, TEMPLATES.length)
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
