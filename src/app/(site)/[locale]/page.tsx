import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { NONCE_HEADER } from '@/shared/config/headers'
import { notFound } from 'next/navigation'
import { asistente, site, webPublica } from '@/app/composition/container'
import { sitioPublico } from '@/modules/admin/domain/site-settings'
import { tieneLuxury } from '@/modules/asistente'
import { capacidadDePlan } from '@/modules/plans'
import { formatMoney } from '@/modules/catalog'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { attempt, isOk } from '@/shared/result'
import { faqJsonLd, jsonLdScript, organizationJsonLd, productJsonLd, websiteJsonLd } from '@/shared/seo/json-ld'
import { buildPageMetadata, truncateDescription } from '@/shared/seo/metadata'
import { fiestaDeCategoria } from '@/sections/fiestas'
import { Portada, type DisenoDePortada } from '@/sections/portada/Portada'
import type { ColumnaDeComparativa } from '@/sections/portada/Comparativa'
import { filasDeLaTabla, lineasQueIncluyenTodos, preciosDeLaTabla } from '@/sections/portada/filas'
import { registrarFallo } from '@/shared/observability/fallos'
import { submitConsultationAction } from '@/app/_acciones/leads/actions'

// Se pinta por petición, no se prerenderiza: lee Postgres, y la imagen se construye en CI,
// donde la base no existe. Las consultas van por índice y a una base de la misma red.
export const dynamic = 'force-dynamic'

/**
 * Las nueve portadas del abanico de entrada, alternando los dos mundos. Son preferencias, no
 * una lista cerrada: lo que no esté a la venta se cae y entra el siguiente del catálogo, así
 * que retirar un modelo en el admin nunca deja un hueco.
 */
const ABANICO = ['xv-isabelle', 'boda-boho', 'xv-mariana', 'boda-cin', 'boda-glamour', 'xv-valeria', 'boda-navy', 'xv-luciana', 'boda-sello'] as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) return {}

  const dictionary = getDictionary(locale)
  // El título y la descripción que escribió el admin en «La web»; vacíos, los de siempre.
  const seo = (await site.settings()).seo.inicio

  return buildPageMetadata({
    locale,
    path: `/${locale}`,
    title: seo.titulo[locale] || dictionary.seo.homeTitle,
    description: truncateDescription(seo.descripcion[locale] || dictionary.seo.homeDescription),
  })
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  // El proxy pone el nonce de la CSP en la petición; sin él, la política rechaza estos bloques.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined

  // Los repositorios lanzan si Postgres no responde: cada lectura va envuelta, y una caída de
  // la base degrada la página sección por sección en vez de devolver un 500.
  const asOutage = (cause: unknown) => ({ kind: 'not_found' as const, detail: cause instanceof Error ? cause.message : 'error desconocido' })

  const ajustes = await site.settings()
  const sitio = sitioPublico(ajustes, locale)

  const [plansResult, templatesResult] = await Promise.all([
    attempt(() => webPublica.planes(locale), asOutage),
    attempt(() => webPublica.modelos(locale), asOutage),
  ])
  if (!isOk(plansResult)) registrarFallo('[locale]/page', 'No se pudieron cargar los planes de precios:', plansResult.error.detail)
  if (!isOk(templatesResult)) registrarFallo('[locale]/page', 'No se pudieron cargar las plantillas del catálogo:', templatesResult.error.detail)

  const plans = isOk(plansResult) ? plansResult.value : []
  const templates = isOk(templatesResult) ? templatesResult.value : []
  if (isOk(templatesResult) && templates.length === 0) {
    // Leer bien y no traer nada no es un error de la base, pero deja la portada sin cinta, sin
    // filtros, sin anillo y sin celebraciones. Sin esta línea solo se veía mirando la web.
    registrarFallo('[locale]/page', 'No se pudo armar la portada completa: el catálogo no tiene ningún diseño publicado')
  }

  // La reserva fija de cada plan, tal como la dejó el admin. Sin ella no se inventa ninguna.
  const activos = await webPublica.planesActivos().catch((cause: unknown) => {
    registrarFallo('[locale]/page', 'No se pudieron leer los planes activos:', cause)
    return null
  })
  if (activos !== null && !activos.ok) {
    registrarFallo('[locale]/page', 'Los planes activos llegaron con error:', activos.error)
  }
  const filas = activos === null || !activos.ok ? [] : activos.value
  const config = asistente.disponible
    ? await asistente.config().catch((cause: unknown) => {
        // Sin registro, una caída de la configuración se leía igual que «no hay clave»: la fila de
        // Luxury desaparecía de la comparativa y nadie se enteraba.
        registrarFallo('[locale]/page', 'No se pudo leer la configuración del asistente:', cause)
        return null
      })
    : null

  // **Los extras a la venta, para los dos sitios donde la web los nombra con su precio**: el pie de
  // los planes (Luxury Planner) y la pregunta del tiempo en línea (más días). El importe sale del
  // admin, nunca escrito aquí: sin extra activo o sin precio, la frase se queda sin importe.
  const extrasActivos = await webPublica.extrasActivos().catch((cause: unknown) => {
    registrarFallo('[locale]/page', 'No se pudieron leer los extras a la venta:', cause)
    return null
  })
  if (extrasActivos !== null && !extrasActivos.ok) {
    registrarFallo('[locale]/page', 'Los extras a la venta llegaron con error:', extrasActivos.error)
  }
  const extras = extrasActivos === null || !extrasActivos.ok ? [] : extrasActivos.value
  // La moneda de la página es la de los planes. El extra trae la suya de la base, y un importe
  // en otra moneda con la etiqueta de esta sería un precio equivocado: se deja sin importe y se
  // anota, que es lo contrario de pintarlo mal.
  const moneda = plans[0]?.price.currency ?? 'BOB'
  const elExtra = (efecto: 'asistente' | 'mas_dias' | 'mas_fotos') => {
    const extra = extras.find((x) => x.effect === efecto && x.priceCents > 0)
    if (extra === undefined) return undefined
    if (extra.currency !== moneda) {
      registrarFallo('[locale]/page', `No se pudo escribir el precio del extra «${extra.slug}»: está en ${extra.currency} y la página cobra en ${moneda}`)
      return undefined
    }
    // Luxury Planner no se nombra si el asistente no está en marcha: la tabla ya le quita su fila,
    // y el panel rechaza la compra («Ese extra no está a la venta»).
    if (efecto === 'asistente' && config === null) return undefined
    return extra
  }
  const conPrecio = (cents: number) => formatMoney({ cents, currency: moneda }, locale)
  const luxuryExtra = elExtra('asistente')
  const diasExtra = elExtra('mas_dias')
  const fotosExtra = elExtra('mas_fotos')
  const textosDeExtras = {
    luxury:
      luxuryExtra === undefined
        ? dictionary.portada.planes.pieLuxurySinPrecio
        : dictionary.portada.planes.pieLuxury.replace('{monto}', conPrecio(luxuryExtra.priceCents)),
    // «90 días» se dice «3 meses» cuando cuadra, como en la tabla.
    dias:
      diasExtra === undefined || diasExtra.amount <= 0
        ? ''
        : dictionary.portada.notas.masDias
            .replace(
              '{tiempo}',
              diasExtra.amount % 30 === 0
                ? dictionary.pricing.comparison.meses.replace('{n}', String(diasExtra.amount / 30))
                : dictionary.pricing.comparison.dias.replace('{n}', String(diasExtra.amount)),
            )
            .replace('{monto}', conPrecio(diasExtra.priceCents)),
    // «Si se llena, puede sumar 500 fotos más por Bs 50»: solo con el extra a la venta y su cantidad cargada.
    fotos:
      fotosExtra === undefined || fotosExtra.amount <= 0
        ? ''
        : dictionary.portada.notas.masFotos.replace('{cantidad}', String(fotosExtra.amount)).replace('{monto}', conPrecio(fotosExtra.priceCents)),
  }

  // Lo que tarda y lo que dura cada plan, tal cual la base: la tarjeta y la tabla enseñan lo mismo.
  const entregas = Object.fromEntries(filas.map((f) => [f.slug, { rondas: f.correctionRounds ?? null, dias: f.deliveryDays ?? null, onlineDays: f.onlineDays }]))
  const reservas = Object.fromEntries(
    filas.flatMap((f) => (f.depositFixedCents != null && f.priceCents !== undefined && f.depositFixedCents < f.priceCents ? [[f.slug, f.depositFixedCents] as const] : [])),
  )

  // La comparativa sale de los límites de cada plan en la base, los mismos que corta el
  // servidor: una tabla escrita a mano acaba prometiendo lo que el plan no trae.
  const columnas: ColumnaDeComparativa[] = plans.flatMap((plan) => {
    const fila = filas.find((f) => f.slug === plan.slug)
    if (fila === undefined) {
      // Un plan publicado que no está entre los activos es un desajuste de datos, no un caso
      // normal: sin esto desaparecía de la tabla y seguía en los sobres, y nadie lo veía.
      registrarFallo('[locale]/page', `No se pudo poner el plan «${plan.slug}» en la comparativa: se vende pero no está entre los planes activos`)
      return []
    }
    const limites = capacidadDePlan(fila)
    // La tabla enseña «Rondas de corrección» y «Lista en» desde la base. **Vacíos los dos, el
    // plan es de autoservicio** y la tabla lo deja en blanco a propósito (lo dice el editor del
    // admin). Vacío uno solo sí es un desajuste: la celda dice «no» y la otra promete un plazo.
    if ((fila.correctionRounds == null) !== (fila.deliveryDays == null)) {
      registrarFallo('[locale]/page', `No se pudo comparar la entrega del plan «${plan.slug}»: trae uno de los dos datos del encargo —rondas o días de entrega— y la tabla deja el otro en blanco`)
    }
    return [
      {
        nombre: plan.name,
        limites: config === null ? limites : { ...limites, asistente: tieneLuxury(limites, config) },
        destacado: plan.highlighted,
        precio: formatMoney(plan.price, locale),
        precioAntes: plan.priceBeforeCents !== null && plan.priceBeforeCents > plan.price.cents ? formatMoney({ cents: plan.priceBeforeCents, currency: plan.price.currency }, locale) : '',
      },
    ]
  })
  const comparacion = dictionary.pricing.comparison
  // **El tope de invitaciones solo se compara si existe.** El documento del 30 oct deja esa fila
  // fuera de la tabla y pone «Envíos ilimitados» en el recuadro de arriba, que es verdad con los
  // planes de hoy: ninguno tiene tope. El día que el admin ponga uno, la fila entra sola y la línea
  // del recuadro se cae, porque ese tope el servidor lo corta de verdad.
  const conTope = columnas.some((c) => c.limites.maxGuestGroups !== null)
  // **El orden de la tabla lo pone la portada** (`filasDeLaTabla`), no el diccionario: son las filas del
  // documento del 30 de octubre. Luxury solo se compara si se vende: sin clave de OpenAI, su fila sobra.
  const textosComparativa = { ...comparacion, filas: filasDeLaTabla(comparacion, { conTope, conLuxury: config !== null }) }
  const { precios: preciosDeExtras, notas: notasDeFila } = preciosDeLaTabla(
    extras.filter((x) => x.currency === moneda && (config !== null || x.effect !== 'asistente')),
    conPrecio,
    comparacion,
  )
  const incluyenTodos = lineasQueIncluyenTodos(dictionary, conTope)

  // Las notas que la portada enseña, con el importe ya escrito: es lo que se marca para Google.
  const laReserva = Object.values(reservas).length === 0 ? '' : formatMoney({ cents: Math.min(...Object.values(reservas)), currency: plans[0]?.price.currency ?? 'BOB' }, locale)
  // Sin reserva cargada, la pregunta que la nombra **no se pinta**: «¿La reserva de  es
  // reembolsable?» con el hueco dentro acabaría también en el marcado que lee Google. Es la misma
  // regla que ya aplica el pie a su frase.
  const conExtras = (texto: string) => texto.replace('{luxury}', textosDeExtras.luxury).replace('{extraDias}', textosDeExtras.dias).replace('{extraFotos}', textosDeExtras.fotos)
  const notasParaGoogle = dictionary.portada.notas.items
    .filter((nota) => laReserva !== '' || !`${nota.pregunta} ${nota.respuesta}`.includes('{reserva}'))
    .map((nota) => ({
      question: nota.pregunta.replace('{reserva}', laReserva),
      answer: conExtras(nota.respuesta).replace('{reserva}', laReserva),
    }))

  // Los modelos del catálogo, en el orden que fijó el admin. La portada enseña los dos mundos.
  const disenos: DisenoDePortada[] = templates.map((t) => ({
    clave: t.slug,
    nombre: t.name,
    fiesta: fiestaDeCategoria(t.categorySlug),
    portada: t.coverImagePath,
  }))
  // El anillo **alterna boda y XV**, como la maqueta. Con el orden del admin tal cual salían las
  // once bodas seguidas y después los nueve XV: media vuelta del cilindro quedaba de un solo tono.
  // Dentro de cada mundo manda el orden del admin.
  const porFiesta = [disenos.filter((d) => d.fiesta === 'boda'), disenos.filter((d) => d.fiesta === 'xv'), disenos.filter((d) => d.fiesta === 'cumple')]
  const alternados: DisenoDePortada[] = []
  for (let i = 0; i < Math.max(...porFiesta.map((grupo) => grupo.length)); i += 1) {
    for (const grupo of porFiesta) {
      const uno = grupo[i]
      if (uno !== undefined) alternados.push(uno)
    }
  }

  const preferidos = ABANICO.flatMap((clave) => disenos.filter((d) => d.clave === clave))
  const abanico = [...preferidos, ...disenos.filter((d) => !preferidos.includes(d))].slice(0, 9)

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            organizationJsonLd({
              whatsapp: sitio.whatsapp,
              direccion: sitio.direccion,
              ciudad: sitio.ciudad,
              pais: sitio.pais,
              redes: [sitio.redes.instagram, sitio.redes.facebook, sitio.redes.tiktok],
              correo: sitio.redes.correo ?? '',
            }),
          ),
        }}
        nonce={nonce}
        type="application/ld+json"
      />
      <script dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd(locale)) }} nonce={nonce} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(plans, locale)) }} nonce={nonce} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(dictionary, notasParaGoogle)) }} nonce={nonce} type="application/ld+json" />

      <Portada
        abanico={abanico}
        columnas={columnas}
        dictionary={dictionary}
        disenos={alternados}
        entregas={entregas}
        extras={textosDeExtras}
        incluyenTodos={incluyenTodos}
        notasDeFila={notasDeFila}
        preciosDeExtras={preciosDeExtras}
        locale={locale}
        planes={plans}
        registrarConsulta={submitConsultationAction}
        reservas={reservas}
        textosComparativa={textosComparativa}
        whatsapp={sitio.whatsapp.replace(/\D/g, '')}
      />
    </>
  )
}
