import { lecturaCacheada, ETIQUETAS_WEB } from '@/shared/cache/lectura-cacheada'
import type { Locale } from '@/shared/i18n/locales'
import { ok } from '@/shared/result'
import { catalog } from './web'
import { admin, plans } from './negocio'

/**
 * Lo que enseña la web pública, **cacheado entre visitas** en la caché de datos de Next —memoria
 * y disco del contenedor, sin infraestructura aparte—. La portada, `/bodas`, `/xv-anos`,
 * `/colecciones`, el pedido, el escaparate y el sitemap leen de aquí; el panel y las acciones
 * siguen leyendo al día de `catalog`, `plans` y `admin`, porque deciden sobre dinero y permisos
 * (una compra de extra se valida contra la base, nunca contra esto).
 *
 * Cada lectura lleva su etiqueta y la acción del admin que la cambia llama a `updateTag`. Las
 * lambdas no son adorno: las referencias a otros ficheros de composición se resuelven al llamar,
 * no al cargar el módulo.
 */
export const webPublica = {
  planes: lecturaCacheada((locale: Locale) => catalog.listPlans(locale), { clave: 'planes', etiquetas: [ETIQUETAS_WEB.catalogo] }),
  modelos: lecturaCacheada((locale: Locale) => catalog.listTemplates(locale), { clave: 'modelos', etiquetas: [ETIQUETAS_WEB.catalogo] }),
  categorias: lecturaCacheada((locale: Locale) => catalog.listCategories(locale), { clave: 'categorias', etiquetas: [ETIQUETAS_WEB.catalogo] }),
  /** Las filas de los planes activos, para la tabla comparativa. */
  planesActivos: lecturaCacheada(async () => ok(await plans.listActive()), { clave: 'planes-activos', etiquetas: [ETIQUETAS_WEB.catalogo] }),
  extrasActivos: lecturaCacheada(async () => ok(await plans.listActiveExtras()), { clave: 'extras-activos', etiquetas: [ETIQUETAS_WEB.extras] }),
  musicaDeModelos: lecturaCacheada(() => admin.showcaseMusic(), { clave: 'musica-modelos', etiquetas: [ETIQUETAS_WEB.modelos] }),
  cancionesDeModelos: lecturaCacheada(async () => ok(await admin.showcaseSongs()), { clave: 'canciones-modelos', etiquetas: [ETIQUETAS_WEB.modelos] }),
} as const
