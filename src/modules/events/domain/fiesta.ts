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
}

export const VOCABULARIO: Record<Fiesta, Vocabulario> = {
  boda: {
    plural: 'Bodas',
    elEvento: 'la boda',
    anfitriones: 'los novios',
    mesaPrincipal: 'De los novios',
    producto: 'Wedding Planner',
    ejemploNombre: 'Boda de Ana y Luis',
  },
  xv: {
    plural: 'XV años',
    elEvento: 'los XV',
    anfitriones: 'la quinceañera',
    mesaPrincipal: 'De la quinceañera',
    producto: 'XV Planner',
    ejemploNombre: 'XV de Valeria',
  },
  cumple: {
    plural: 'Cumpleaños',
    elEvento: 'el cumpleaños',
    anfitriones: 'quien cumple',
    mesaPrincipal: 'De quien cumple',
    producto: 'Party Planner',
    ejemploNombre: 'Cumpleaños de Miguel',
  },
}
