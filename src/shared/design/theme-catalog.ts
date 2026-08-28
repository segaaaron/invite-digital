/**
 * Lo que el escaparate necesita saber de cada diseño.
 *
 * Módulo **puro**: sin JSX y sin `next/dynamic`, para que `pnpm db:seed` —que corre en
 * Node, también en producción— pueda leerlo sin arrastrar React ni el diseño entero.
 * `registry.ts` sí los arrastra, y por eso el seed no puede importarlo.
 *
 * Los dos sitios se mantienen a la par con una prueba: cada entrada de aquí tiene que
 * tener su tema registrado, y cada tema registrado su entrada aquí. Sin ella, añadir un
 * diseño y olvidarse del catálogo —o al revés— no lo cantaría nada hasta que un cliente
 * pulsara una tarjeta.
 *
 * `accent` y `base` son los dos colores con los que se dibuja la **tarjeta de papel** del
 * catálogo: el filete y la cinta van en el acento, y el papel en la base. Salen de la
 * paleta del diseño, que es de donde tienen que salir.
 */
export type CatalogEntry = {
  readonly key: string
  /**
   * Si el diseño ya está portado y su tema registrado.
   *
   * El seed publica **solo los que lo están**. Es lo que impide que el escaparate enseñe
   * una tarjeta que lleva a un 404 mientras la colección se termina de portar, y una
   * prueba comprueba que esta marca y el registro de temas dicen lo mismo: no se puede
   * marcar aquí sin registrar allí, ni al revés.
   */
  readonly listo: boolean
  readonly categorySlug: 'boda' | 'boda-civil' | 'xv-anos'
  readonly es: string
  readonly en: string
  readonly palette: { readonly base: string; readonly accent: string }
  /** Lo que la tarjeta dibuja. Es escaparate, no un evento de verdad. */
  readonly sample: {
    readonly monogram: string
    /** Con `\n` donde el diseño parte la línea. La tarjeta respeta el salto tal cual. */
    readonly names: string
    readonly dateLabel: string
    readonly venue: string
  }
}

export const CATALOG_ENTRIES: readonly CatalogEntry[] = [
  // ─────────── BODAS ───────────
  {
    key: 'boda-bot',
    listo: true,
    categorySlug: 'boda',
    es: 'Botánica',
    en: 'Botanical',
    palette: { base: '#fafaf6', accent: '#5a705c' },
    sample: { monogram: 'M & R', names: 'Marcia\n& Ricardo', dateLabel: '18 · 10 · 2026', venue: 'Jardín de los Olivos' },
  },
  {
    key: 'boda-ed',
    listo: true,
    categorySlug: 'boda',
    es: 'Editorial',
    en: 'Editorial',
    palette: { base: '#f1ede4', accent: '#aa6e4e' },
    sample: { monogram: 'M & A', names: 'María\n& Alex', dateLabel: '20 · 09 · 2026', venue: 'Casa Editorial, Centro' },
  },
  {
    key: 'boda-cin',
    listo: true,
    categorySlug: 'boda',
    es: 'Cinemática',
    en: 'Cinematic',
    palette: { base: '#0a0805', accent: '#b8945a' },
    sample: { monogram: 'S & D', names: 'Sofía\n& Diego', dateLabel: '12 · 12 · 2026', venue: 'Teatro Municipal' },
  },
  {
    key: 'boda',
    listo: true,
    categorySlug: 'boda',
    es: 'Étoile',
    en: 'Étoile',
    palette: { base: '#08070d', accent: '#d4b483' },
    sample: { monogram: 'C & M', names: 'Camila\n& Mateo', dateLabel: '14 · 11 · 2026', venue: 'Viñedo La Aurora' },
  },
  {
    key: 'civil',
    listo: false,
    categorySlug: 'boda-civil',
    es: 'Civil',
    en: 'Civil',
    palette: { base: '#ece8df', accent: '#7c5cff' },
    sample: { monogram: 'L & A', names: 'Lucía\n& Andrés', dateLabel: '18 · 05 · 2026', venue: 'Registro Civil, Sala 2' },
  },
  {
    key: 'aniv',
    listo: false,
    categorySlug: 'boda',
    es: 'Bodas de Oro',
    en: 'Golden Anniversary',
    palette: { base: '#1a1208', accent: '#e0b85a' },
    sample: { monogram: 'L', names: 'Bodas\nde Oro', dateLabel: '08 · 08 · 2026', venue: 'Hacienda del Sol' },
  },
  {
    key: 'eng',
    listo: false,
    categorySlug: 'boda',
    es: 'Compromiso',
    en: 'Engagement',
    palette: { base: '#fef6f3', accent: '#d4566c' },
    sample: { monogram: 'D', names: 'Dijo\nque sí', dateLabel: '12 · 04 · 2026', venue: 'Terraza del Río' },
  },
  {
    key: 'dest',
    listo: false,
    categorySlug: 'boda',
    es: 'Destino',
    en: 'Destination',
    palette: { base: '#06283d', accent: '#f0d39b' },
    sample: { monogram: 'A & P', names: 'Alejandra\n& Pablo', dateLabel: '14 · 02 · 2027', venue: 'Playa Tulum' },
  },

  // ─────────── XV AÑOS ───────────
  {
    key: 'xv',
    listo: false,
    categorySlug: 'xv-anos',
    es: 'Bajo el Mar',
    en: 'Under the Sea',
    palette: { base: '#f3ecff', accent: '#c98ad0' },
    sample: { monogram: 'S', names: 'Sofía', dateLabel: '12 · 09 · 2026', venue: 'Salón Elianne' },
  },
  {
    key: 'xv-natalia',
    listo: false,
    categorySlug: 'xv-anos',
    es: 'Encanto Marino',
    en: 'Sea Charm',
    palette: { base: '#f3ecff', accent: '#e8a8d8' },
    sample: { monogram: 'N', names: 'Natalia', dateLabel: '12 · 09 · 2026', venue: 'Salón Elianne' },
  },
  {
    key: 'xv-valentina',
    listo: false,
    categorySlug: 'xv-anos',
    es: 'Mascarada',
    en: 'Masquerade',
    palette: { base: '#2a1140', accent: '#c9a227' },
    sample: { monogram: 'V', names: 'Valentina', dateLabel: '12 · 09 · 2026', venue: 'Palacio Veneciano' },
  },
  {
    key: 'xv-luciana',
    listo: false,
    categorySlug: 'xv-anos',
    es: 'Bosque Encantado',
    en: 'Enchanted Forest',
    palette: { base: '#0f2a1f', accent: '#6e9b4f' },
    sample: { monogram: 'L', names: 'Luciana', dateLabel: '12 · 09 · 2026', venue: 'Quinta del Bosque' },
  },
  {
    key: 'xv-fantasia',
    listo: false,
    categorySlug: 'xv-anos',
    es: 'Noche Estrellada',
    en: 'Starry Night',
    palette: { base: '#0c1830', accent: '#d4af5a' },
    sample: { monogram: 'A', names: 'Alicia', dateLabel: '12 · 09 · 2026', venue: 'Salón Constelación' },
  },
  {
    key: 'xv-valeria',
    listo: false,
    categorySlug: 'xv-anos',
    es: 'Gala Real',
    en: 'Royal Gala',
    palette: { base: '#2b050c', accent: '#d9b85c' },
    sample: { monogram: 'V', names: 'Valeria', dateLabel: '12 · 09 · 2026', venue: 'Salón Elianne' },
  },
  {
    key: 'xv-mariana',
    listo: false,
    categorySlug: 'xv-anos',
    es: 'Encanto Musical',
    en: 'Musical Charm',
    palette: { base: '#0c1830', accent: '#c9ccd4' },
    sample: { monogram: 'M', names: 'Mariana', dateLabel: '12 · 09 · 2026', venue: 'Salón Plata' },
  },
  {
    key: 'xv-isabelle',
    listo: false,
    categorySlug: 'xv-anos',
    es: 'Palacio Griego',
    en: 'Greek Palace',
    palette: { base: '#fafaf6', accent: '#5a705c' },
    sample: { monogram: 'I', names: 'Isabelle', dateLabel: '14 · 11 · 2026', venue: 'Villa Helena' },
  },
]

/** Las claves del catálogo, en el orden en que se enseñan. Las dieciséis, portadas o no. */
export const CATALOG_KEYS: readonly string[] = CATALOG_ENTRIES.map((entrada) => entrada.key)

/** Lo que el escaparate publica: solo lo que un tema sabe pintar. */
export const CATALOG_LISTOS: readonly CatalogEntry[] = CATALOG_ENTRIES.filter((entrada) => entrada.listo)
