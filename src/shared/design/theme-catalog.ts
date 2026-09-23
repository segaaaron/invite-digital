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
  readonly categorySlug: 'boda' | 'boda-civil' | 'xv-anos' | 'cumpleanos'
  /**
   * Si la web lo vende. **Por defecto sí**; `false` lo deja registrado y portado pero
   * **retirado del escaparate**: el seed lo inserta sin publicar, así que no sale en el
   * catálogo, ni en la página de su fiesta, ni en el mapa del sitio. El admin lo asigna a
   * un evento desde el panel y lo publica cuando quiera desde `/panel/admin/modelos`, y
   * el seed no lo vuelve a retirar —`isPublished` no se toca al actualizar—.
   */
  readonly publicar?: boolean
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
    es: 'Clásica - Floral',
    en: 'Classic - Floral',
    palette: { base: '#fafaf6', accent: '#5a705c' },
    sample: { monogram: 'M & R', names: 'Marcia\n& Ricardo', dateLabel: '18 · 10 · 2026', venue: 'Jardín de los Olivos' },
  },
  {
    key: 'esencia',
    listo: true,
    categorySlug: 'boda',
    es: 'Esencia - Olivo',
    en: 'Esencia - Olive',
    palette: { base: '#faf7f2', accent: '#b8956a' },
    sample: { monogram: 'V & M', names: 'Valentina\n& Mateo', dateLabel: '20 · 12 · 2027', venue: 'Jardín Las Magnolias' },
  },
  {
    key: 'boda-sello',
    listo: true,
    categorySlug: 'boda',
    es: 'Romántica - Artesanal',
    en: 'Romantic - Artisan',
    palette: { base: '#f2ede4', accent: '#c9a961' },
    sample: { monogram: 'C & S', names: 'Camila\n& Sebastián', dateLabel: '14 · 11 · 2026', venue: 'Salón Los Cedros' },
  },
  {
    key: 'boda-serenidad',
    listo: true,
    categorySlug: 'boda',
    es: 'Editorial - Jardín de Serenidad',
    en: 'Editorial - Serenity Garden',
    palette: { base: '#d6dce8', accent: '#1a2b4a' },
    sample: { monogram: 'S & D', names: 'Sofía\n& Daniel', dateLabel: '20 · 09 · 2026', venue: 'Salón Los Cedros' },
  },
  {
    key: 'boda-royal',
    listo: true,
    categorySlug: 'boda',
    es: 'Editorial - Royal Blush',
    en: 'Editorial - Royal Blush',
    palette: { base: '#f5d6d0', accent: '#8b2252' },
    sample: { monogram: 'R & P', names: 'Renata\n& Pablo', dateLabel: '20 · 09 · 2026', venue: 'Salón Los Cedros' },
  },  {
    key: 'boda-navy',
    listo: true,
    categorySlug: 'boda',
    es: 'Editorial - Noche Estrellada',
    en: 'Editorial - Starry Night',
    palette: { base: '#0a1628', accent: '#c5963a' },
    sample: { monogram: 'M & A', names: 'Maya\n& Anderson', dateLabel: '20 · 09 · 2026', venue: 'Salón Los Cedros' },
  },  {
    key: 'boda-perla',
    listo: true,
    categorySlug: 'boda',
    es: 'Editorial - Marco Perlado',
    en: 'Editorial - Pearl Frame',
    palette: { base: '#ede0c8', accent: '#d4b678' },
    sample: { monogram: 'E & G', names: 'Emma\n& Gael', dateLabel: '20 · 09 · 2026', venue: 'Salón Los Cedros' },
  },  {
    key: 'boda-boho',
    listo: true,
    categorySlug: 'boda',
    es: 'Editorial - Pampas y Flores Secas',
    en: 'Editorial - Pampas and Dried Flowers',
    palette: { base: '#f5ead9', accent: '#b8795a' },
    sample: { monogram: 'S & O', names: 'Sara\n& Óscar', dateLabel: '20 · 09 · 2026', venue: 'Salón Los Cedros' },
  },  {
    key: 'boda-glamour',
    listo: true,
    categorySlug: 'boda',
    es: 'Glamour - Íconos 3D',
    en: 'Glamour - 3D Icons',
    palette: { base: '#3a0015', accent: '#c5963a' },
    sample: { monogram: 'V & N', names: 'Valeria\n& Nicolas', dateLabel: '20 · 09 · 2026', venue: 'Salón Los Cedros' },
  },




  {
    key: 'boda-ed',
    listo: true,
    categorySlug: 'boda',
    es: 'Editorial - Revista',
    en: 'Editorial - Magazine',
    palette: { base: '#f1ede4', accent: '#aa6e4e' },
    sample: { monogram: 'M & A', names: 'María\n& Alex', dateLabel: '20 · 09 · 2026', venue: 'Casa Editorial, Centro' },
  },
  {
    key: 'boda-cin',
    listo: true,
    categorySlug: 'boda',
    es: 'Cinemática - Póster',
    en: 'Cinematic - Poster',
    palette: { base: '#0a0805', accent: '#b8945a' },
    sample: { monogram: 'S & D', names: 'Sofía\n& Diego', dateLabel: '12 · 12 · 2026', venue: 'Teatro Municipal' },
  },
  {
    key: 'boda',
    listo: true,
    categorySlug: 'boda',
    es: 'Étoile - Nocturna',
    en: 'Étoile - Nocturne',
    palette: { base: '#08070d', accent: '#d4b483' },
    sample: { monogram: 'C & M', names: 'Camila\n& Mateo', dateLabel: '14 · 11 · 2026', venue: 'Viñedo La Aurora' },
  },
  {
    key: 'civil',
    listo: true,
    categorySlug: 'boda-civil',
    es: 'Civil - Minimalista',
    en: 'Civil - Minimal',
    palette: { base: '#ece8df', accent: '#7c5cff' },
    sample: { monogram: 'L & A', names: 'Lucía\n& Andrés', dateLabel: '18 · 05 · 2026', venue: 'Registro Civil, Sala 2' },
  },
  {
    key: 'aniv',
    listo: true,
    categorySlug: 'boda',
    es: 'Bodas de Oro - Aniversario',
    en: 'Golden Anniversary - Milestone',
    palette: { base: '#1a1208', accent: '#e0b85a' },
    sample: { monogram: 'L', names: 'Bodas\nde Oro', dateLabel: '08 · 08 · 2026', venue: 'Hacienda del Sol' },
  },
  {
    key: 'eng',
    listo: true,
    categorySlug: 'boda',
    es: 'Compromiso - Pedida',
    en: 'Engagement - Proposal',
    palette: { base: '#fef6f3', accent: '#d4566c' },
    sample: { monogram: 'D', names: 'Dijo\nque sí', dateLabel: '12 · 04 · 2026', venue: 'Terraza del Río' },
  },
  {
    key: 'dest',
    listo: true,
    categorySlug: 'boda',
    es: 'Destino - Playa',
    en: 'Destination - Beach',
    palette: { base: '#06283d', accent: '#f0d39b' },
    sample: { monogram: 'A & P', names: 'Alejandra\n& Pablo', dateLabel: '14 · 02 · 2027', venue: 'Playa Tulum' },
  },

  // ─────────── XV AÑOS ───────────
  {
    key: 'xv',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Bajo el Mar',
    en: 'Under the Sea',
    palette: { base: '#f3ecff', accent: '#c98ad0' },
    sample: { monogram: 'S', names: 'Sofía', dateLabel: '12 · 09 · 2026', venue: 'Salón Elianne' },
  },
  {
    key: 'xv-natalia',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Encanto Marino',
    en: 'Sea Charm',
    palette: { base: '#f3ecff', accent: '#e8a8d8' },
    sample: { monogram: 'N', names: 'Natalia', dateLabel: '12 · 09 · 2026', venue: 'Salón Elianne' },
  },
  {
    key: 'xv-valentina',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Mascarada',
    en: 'Masquerade',
    palette: { base: '#2a1140', accent: '#c9a227' },
    sample: { monogram: 'V', names: 'Valentina', dateLabel: '12 · 09 · 2026', venue: 'Palacio Veneciano' },
  },
  {
    key: 'xv-luciana',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Bosque Encantado',
    en: 'Enchanted Forest',
    palette: { base: '#0f2a1f', accent: '#6e9b4f' },
    sample: { monogram: 'L', names: 'Luciana', dateLabel: '12 · 09 · 2026', venue: 'Quinta del Bosque' },
  },
  {
    key: 'xv-fantasia',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Noche Estrellada',
    en: 'Starry Night',
    palette: { base: '#0c1830', accent: '#d4af5a' },
    sample: { monogram: 'A', names: 'Alicia', dateLabel: '12 · 09 · 2026', venue: 'Salón Constelación' },
  },
  {
    key: 'xv-valeria',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Gala Real',
    en: 'Royal Gala',
    palette: { base: '#2b050c', accent: '#d9b85c' },
    sample: { monogram: 'V', names: 'Valeria', dateLabel: '12 · 09 · 2026', venue: 'Salón Elianne' },
  },
  {
    key: 'xv-mariana',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Encanto Musical',
    en: 'Musical Charm',
    palette: { base: '#0c1830', accent: '#c9ccd4' },
    sample: { monogram: 'M', names: 'Mariana', dateLabel: '12 · 09 · 2026', venue: 'Salón Plata' },
  },
  {
    key: 'xv-isabelle',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Palacio Griego',
    en: 'Greek Palace',
    palette: { base: '#fafaf6', accent: '#5a705c' },
    sample: { monogram: 'I', names: 'Isabelle', dateLabel: '14 · 11 · 2026', venue: 'Villa Helena' },
  },  {
    key: 'xv-deco',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Art Déco',
    en: 'Art Deco',
    palette: { base: '#12100c', accent: '#d4af55' },
    sample: { monogram: 'A', names: 'Alessandra', dateLabel: '07 · 11 · 2026', venue: 'Gran Salón Imperial' },
  },  {
    key: 'xv-realeza',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Realeza Cristal',
    en: 'Crystal Royalty',
    palette: { base: '#eaf3fb', accent: '#5a9fd4' },
    sample: { monogram: 'C', names: 'Camila', dateLabel: '12 · 12 · 2026', venue: 'Salón Castillo Azul' },
  },  {
    key: 'xv-vogue',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Rosa Pastel',
    en: 'Pastel Pink',
    palette: { base: '#0f0d0f', accent: '#d4566c' },
    sample: { monogram: 'I', names: 'Isabela', dateLabel: '19 · 09 · 2026', venue: 'Salón Rosa Vogue' },
  },  {
    key: 'xv-y2k',
    listo: true,
    categorySlug: 'xv-anos',
    es: 'Y2K Galaxy',
    en: 'Y2K Galaxy',
    palette: { base: '#0a0220', accent: '#ff6ed4' },
    sample: { monogram: 'M', names: 'Mariana', dateLabel: '08 · 10 · 2026', venue: 'Sky Lounge' },
  },





  // ─────────── CUMPLEAÑOS ───────────
  {
    key: 'cumple-beer',
    listo: true,
    // No se vende todavía: nace retirado del escaparate y solo el admin lo asigna.
    publicar: false,
    categorySlug: 'cumpleanos',
    es: 'Cervecería Vintage',
    en: 'Vintage Brewery',
    palette: { base: '#1c140c', accent: '#d4a94b' },
    sample: { monogram: 'M', names: 'Miguel', dateLabel: '26 · 09 · 2026', venue: 'El Bar de Miki' },
  },
]

/** Las claves del catálogo, en el orden en que se enseñan. Las dieciséis, portadas o no. */
export const CATALOG_KEYS: readonly string[] = CATALOG_ENTRIES.map((entrada) => entrada.key)

/** Lo que el motor sabe pintar: los diseños portados, los venda la web o no. */
export const CATALOG_LISTOS: readonly CatalogEntry[] = CATALOG_ENTRIES.filter((entrada) => entrada.listo)

/**
 * Lo que la web enseña: los portados **y** puestos a la venta.
 *
 * `cumple-beer` está portado y no se vende: existe en el panel del admin y no en el
 * catálogo. El seed publica esta lista, no `CATALOG_LISTOS`.
 */
export const CATALOG_EN_VENTA: readonly CatalogEntry[] = CATALOG_LISTOS.filter((entrada) => entrada.publicar !== false)

/**
 * Si la web vende ese diseño.
 *
 * `cumple-beer` está portado y **no** se vende: el seed lo deja retirado del catálogo y su
 * ficha de escaparate va con `noindex`, porque la dirección existe —el panel enlaza a ella
 * para verlo— y no debe acabar en un buscador antes de que se ponga a la venta.
 */
export const seVende = (key: string): boolean =>
  CATALOG_ENTRIES.find((entrada) => entrada.key === key)?.publicar !== false
