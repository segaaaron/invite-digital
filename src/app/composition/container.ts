// Raíz de composición: el único lugar donde se conectan los puertos de `application`
// con sus implementaciones de `infrastructure`. Vive en `src/app` (no en `src/shared`)
// porque la configuración de fronteras de ESLint (`eslint.config.mjs`) solo permite que
// el tipo `app` importe de `infrastructure`; `shared` solo puede importar de `shared`.
// Ver el informe de la Task 7 para el detalle de esta decisión.
//
// **Partida por áreas** (15 de septiembre de 2026): eran 880 líneas en un fichero y cualquier
// cambio tocaba el mismo sitio. Cada área compone lo suyo en su fichero; este reexporta todo
// para que ningún `import '@/app/composition/container'` del proyecto cambie. Lo compartido
// —reloj, acuñador, lectura de «La web»— vive en `base.ts`.
export * from './web'
export * from './identidad'
export * from './eventos'
export * from './dia-del-evento'
export * from './negocio'
export * from './web-publica'
