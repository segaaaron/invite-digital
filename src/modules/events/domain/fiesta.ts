/**
 * La fiesta de un evento: **boda, XV años o cumpleaños**. Son productos distintos que nunca
 * se mezclan —ni en las listas de diseños, ni en las plantillas de tareas, ni en el cambio
 * de diseño—, aunque por dentro compartan motor.
 *
 * La decide el modelo que se compra y no cambia. Aquí vive la regla y el vocabulario con
 * el que el panel habla de cada una; quien tenga una categoría de catálogo pregunta aquí,
 * en vez de comparar con `'xv-anos'` suelto.
 *
 * **`cumple` no se vende en la web todavía.** Su único diseño nace despublicado y solo el
 * admin puede asignarlo a un evento; el vocabulario y las plantillas existen porque el
 * panel de ese evento es el mismo, y sin ellos un cumpleaños hablaría de «los novios» y su
 * plan de tareas pediría reservar la iglesia.
 */
export type Fiesta = 'boda' | 'xv' | 'cumple'

export const FIESTAS: readonly Fiesta[] = ['boda', 'xv', 'cumple']

/**
 * Las que la web pública vende hoy: cada una tiene su página, su tarjeta en la portada y
 * su entrada en el diccionario. El cumpleaños no tiene ninguna de las tres, y por eso todo
 * lo que se pinta de cara al cliente pide **esto** y no `Fiesta` a secas.
 */
export type FiestaPublica = Extract<Fiesta, 'boda' | 'xv'>

export const FIESTAS_A_LA_VENTA: readonly FiestaPublica[] = ['boda', 'xv']

/** La boda civil es una boda. Lo desconocido cae a boda: es la fiesta del diseño de respaldo. */
export const fiestaDeCategoria = (categoria: string): Fiesta =>
  categoria === 'xv-anos' ? 'xv' : categoria === 'cumpleanos' ? 'cumple' : 'boda'

/**
 * La fiesta de un diseño por su clave, para quien no puede cargar el registro de temas
 * (el contenedor, el mantenimiento). Los de XV son `xv` o empiezan por `xv-`, y los de
 * cumpleaños `cumple` o `cumple-`; lo ata una prueba contra la categoría de cada diseño
 * del registro.
 */
export const fiestaDeTema = (themeKey: string): Fiesta =>
  themeKey === 'xv' || themeKey.startsWith('xv-')
    ? 'xv'
    : themeKey === 'cumple' || themeKey.startsWith('cumple-')
      ? 'cumple'
      : 'boda'

export const mismaFiesta = (a: string, b: string): boolean => fiestaDeCategoria(a) === fiestaDeCategoria(b)

export type Vocabulario = {
  /** «Bodas», «XV años»: el nombre de la fiesta en plural, para pestañas y títulos. */
  readonly plural: string
  /** «la boda», «los XV». */
  readonly elEvento: string
  /** «los novios», «la quinceañera». */
  readonly anfitriones: string
  /** Rótulo de la mesa principal en el plano. */
  readonly mesaPrincipal: string
  /** «Wedding Planner», «XV Planner»: el nombre del producto en la web. */
  readonly producto: string
  /** Ejemplo de nombre de evento para los campos vacíos. */
  readonly ejemploNombre: string
  /**
   * Los ejemplos de los campos vacíos del panel que dependen de la fiesta: un «Vals con papá»
   * en un cumpleaños o una «Luna de miel» en unos XV se leen como un error del sistema.
   */
  readonly ejemplos: {
    /** Un momento del cronograma. */
    readonly momento: string
    /** El nombre de un fondo en efectivo y su descripción. */
    readonly fondo: string
    readonly fondoDetalle: string
    /** Lo que apadrina alguien del cortejo. */
    readonly apadrina: string
  }
}

export const VOCABULARIO: Record<Fiesta, Vocabulario> = {
  boda: {
    plural: 'Bodas',
    elEvento: 'la boda',
    anfitriones: 'los novios',
    mesaPrincipal: 'De los novios',
    producto: 'Wedding Planner',
    ejemploNombre: 'Boda de Ana y Luis',
    ejemplos: {
      momento: 'Primer baile',
      fondo: 'Luna de miel',
      fondoDetalle: 'Para los pasajes y las noches de hotel.',
      apadrina: 'Aros, arras, lazo…',
    },
  },
  xv: {
    plural: 'XV años',
    elEvento: 'los XV',
    anfitriones: 'la quinceañera',
    mesaPrincipal: 'De la quinceañera',
    producto: 'XV Planner',
    ejemploNombre: 'XV de Valeria',
    ejemplos: {
      momento: 'Vals con papá',
      fondo: 'Viaje de quince años',
      fondoDetalle: 'Para el viaje que sueña hace tiempo.',
      apadrina: 'Corona, última muñeca, cojín…',
    },
  },
  cumple: {
    plural: 'Cumpleaños',
    elEvento: 'el cumpleaños',
    anfitriones: 'quien cumple',
    mesaPrincipal: 'De quien cumple',
    producto: 'Party Planner',
    ejemploNombre: 'Cumpleaños de Miguel',
    ejemplos: {
      momento: 'Soplar las velas',
      fondo: 'Una experiencia',
      fondoDetalle: 'Para el regalo que de verdad le hace ilusión.',
      apadrina: 'Torta, decoración, música…',
    },
  },
}

/**
 * El vocabulario de una fiesta que el panel todavía no conoce —un bautizo, una graduación, un
 * evento de empresa—. Habla de «el evento» y pone ejemplos que valen para cualquiera, en vez
 * de caer a los de boda: un evento corporativo no tiene novios.
 */
export const VOCABULARIO_GENERICO: Vocabulario = {
  plural: 'Otros eventos',
  elEvento: 'el evento',
  anfitriones: 'los anfitriones',
  mesaPrincipal: 'Principal',
  producto: 'Event Planner',
  ejemploNombre: 'Nombre del evento',
  ejemplos: {
    momento: 'Brindis de bienvenida',
    fondo: 'Regalo en efectivo',
    fondoDetalle: 'Para lo que más ilusión le haga.',
    apadrina: 'Torta, decoración, música…',
  },
}

const CATEGORIAS_CONOCIDAS: ReadonlySet<string> = new Set(['boda', 'boda-civil', 'xv-anos', 'cumpleanos'])

/**
 * El vocabulario por la categoría del catálogo. Una categoría que el panel aún no conoce usa
 * el genérico, no el de boda: es lo que cubre la categoría nueva hasta que tenga el suyo.
 */
export const vocabularioDeCategoria = (categoria: string): Vocabulario =>
  CATEGORIAS_CONOCIDAS.has(categoria) ? VOCABULARIO[fiestaDeCategoria(categoria)] : VOCABULARIO_GENERICO
