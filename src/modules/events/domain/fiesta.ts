/**
 * La fiesta de un evento: **boda o XV años**. Son dos productos distintos que nunca se
 * mezclan —ni en las listas de diseños, ni en las plantillas de tareas, ni en el cambio de
 * diseño—, aunque por dentro compartan motor.
 *
 * La decide el modelo que se compra y no cambia. Aquí vive la regla y el vocabulario con
 * el que el panel habla de cada una; quien tenga una categoría de catálogo pregunta aquí,
 * en vez de comparar con `'xv-anos'` suelto.
 */
export type Fiesta = 'boda' | 'xv'

export const FIESTAS: readonly Fiesta[] = ['boda', 'xv']

/** La boda civil es una boda. Lo desconocido cae a boda: es la fiesta del diseño de respaldo. */
export const fiestaDeCategoria = (categoria: string): Fiesta => (categoria === 'xv-anos' ? 'xv' : 'boda')

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
}
