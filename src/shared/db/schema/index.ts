// El esquema de Drizzle, **partido por áreas** (15 de septiembre de 2026): eran 1.170 líneas
// en un fichero. Este índice reexporta todas las tablas y relaciones, así que
// `@/shared/db/schema` y `import * as schema from './schema'` siguen igual.
//
// `base.ts` —marcas de tiempo y tipos propios— no se reexporta: no es una tabla, y el
// objeto que recibe `drizzle()` debe tener solo tablas y relaciones.
//
// Ojo con los reemplazos a ciegas: `amount_cents` existe en tres tablas; ancla el cambio en
// el nombre de la tabla y en su fichero.
export * from './catalogo'
export * from './identidad'
export * from './eventos'
export * from './invitados'
export * from './salon-y-regalos'
export * from './negocio'
export * from './planner'
