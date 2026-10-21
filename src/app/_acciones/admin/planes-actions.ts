'use server'

import { revalidatePath } from 'next/cache'
import { admin, plans } from '@/app/composition/container'
import { leerExtra } from '@/modules/plans'
import { requireAdmin } from '@/app/_acciones/sesion'
import { parseAmount } from '@/shared/money'
import { isErr } from '@/shared/result'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { invalidarLaWeb, refrescar, texto } from '@/app/_acciones/admin/admin-comun'
import { registrarFallo } from '@/shared/observability/fallos'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo: planes y publicación de modelos. La web pública es `force-dynamic`, así que
// lo guardado se ve en la siguiente visita sin revalidar nada fuera del panel.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guarda un plan. El importe se parsea **aquí**, con `parseAmount` de la mesa de regalos:
 * el dominio no puede importar otro módulo y el dinero se convierte en un solo sitio.
 */
export async function savePlanAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const t = await tr()
  const actor = await requireAdmin()

  const slug = texto(formData, 'slug')
  const valores = Object.fromEntries([...formData.entries()].filter((par): par is [string, string] => typeof par[1] === 'string'))
  const precio = parseAmount(texto(formData, 'price'))
  if (isErr(precio)) return { status: 'error', message: traducir(precio.error.detail, t), valores }
  const reservaTexto = texto(formData, 'depositFixed').trim()
  const reserva = reservaTexto === '' ? null : parseAmount(reservaTexto)
  if (reserva !== null && isErr(reserva)) return { status: 'error', message: t(`Reserva fija: ${reserva.error.detail}`, `Fixed deposit: ${traducir(reserva.error.detail, t)}`), valores }
  const antesTexto = texto(formData, 'priceBefore').trim()
  const antes = antesTexto === '' ? null : parseAmount(antesTexto)
  if (antes !== null && isErr(antes)) return { status: 'error', message: t(`Precio de lanzamiento: ${antes.error.detail}`, `Launch price: ${traducir(antes.error.detail, t)}`), valores }
  const usdTexto = texto(formData, 'priceUsd').trim()
  const usd = usdTexto === '' ? null : parseAmount(usdTexto)
  if (usd !== null && isErr(usd)) return { status: 'error', message: t(`Precio en dólares: ${usd.error.detail}`, `Price in dollars: ${traducir(usd.error.detail, t)}`), valores }

  const marcado = (clave: string) => formData.get(clave) === 'on'
  const textoDe = (locale: 'es' | 'en') => ({
    name: texto(formData, `${locale}.name`),
    tagline: texto(formData, `${locale}.tagline`),
    description: texto(formData, `${locale}.description`),
    features: texto(formData, `${locale}.features`),
  })

  const guardado = await admin.savePlan(actor, slug, {
    priceCents: precio.value,
    priceBeforeCents: antes === null ? null : antes.value,
    maxGuestGroups: texto(formData, 'maxGuestGroups'),
    maxDoorPorters: texto(formData, 'maxDoorPorters'),
    maxCohosts: texto(formData, 'maxCohosts'),
    maxHiredPlanners: texto(formData, 'maxHiredPlanners'),
    maxGalleryPhotos: texto(formData, 'maxGalleryPhotos'),
    guestPhotos: marcado('guestPhotos'),
    eventPassword: marcado('eventPassword'),
    csvImport: marcado('csvImport'),
    onlineDays: texto(formData, 'onlineDays'),
    designChange: texto(formData, 'designChange'),
    plannerSuite: texto(formData, 'plannerSuite'),
    depositPct: texto(formData, 'depositPct'),
    depositFixedCents: reserva === null ? null : reserva.value,
    priceUsdCents: usd === null ? null : usd.value,
    correctionRounds: texto(formData, 'correctionRounds'),
    deliveryDays: texto(formData, 'deliveryDays'),
    includesSeating: marcado('includesSeating'),
    includesRegistry: marcado('includesRegistry'),
    includesCheckin: marcado('includesCheckin'),
    includesGuestbook: marcado('includesGuestbook'),
    includesGiftWays: marcado('includesGiftWays'),
    includesStyle: marcado('includesStyle'),
    highlighted: marcado('highlighted'),
    isActive: marcado('isActive'),
    es: textoDe('es'),
    en: textoDe('en'),
  })
  if (isErr(guardado)) {
    if (guardado.error.kind === 'storage_failure') {
      registrarFallo('admin/planes-actions', 'savePlanAction', guardado.error.detail)
      return { status: 'error', message: t('No pudimos guardar el plan. Vuelve a intentarlo en un momento.', 'We couldn’t save the plan. Try again in a moment.'), valores }
    }
    return { status: 'error', message: traducir(guardado.error.detail, t), valores }
  }

  revalidatePath('/panel/admin/planes')
  refrescar()
  invalidarLaWeb('catalogo')
  return { status: 'success', message: t('Plan guardado. La web ya enseña los cambios.', 'Plan saved. The website now shows the changes.') }
}

/**
 * Edita un extra del catálogo: nombre, precio, qué hace y si está a la venta. Venderlo es una
 * decisión comercial y va aquí, no en una migración. Lo ya vendido no cambia: el pedido
 * congeló su importe y el evento copió el efecto.
 */
export async function saveExtraAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const t = await tr()
  const actor = await requireAdmin()
  const slug = texto(formData, 'slug')
  const valores = Object.fromEntries([...formData.entries()].filter((par): par is [string, string] => typeof par[1] === 'string'))
  const precio = parseAmount(texto(formData, 'price'))
  if (isErr(precio)) return { status: 'error', message: traducir(precio.error.detail, t), valores }

  const leido = leerExtra({ name: texto(formData, 'name'), priceCents: precio.value, effect: texto(formData, 'effect'), amount: texto(formData, 'amount'), isActive: formData.get('isActive') === 'on' })
  if (!leido.ok) return { status: 'error', message: leido.mensaje, valores }
  if (!(await plans.updateExtra(slug, leido.valor))) return { status: 'error', message: t('Ese extra ya no existe.', 'That extra no longer exists.'), valores }

  await admin.record(actor, { action: 'extra.editado', subject: slug, detail: `${leido.valor.name} · ${leido.valor.priceCents / 100} · ${leido.valor.isActive ? 'a la venta' : 'apagado'}` })
  revalidatePath('/panel/admin/extras')
  refrescar()
  invalidarLaWeb('extras')
  return { status: 'success', message: t('Extra guardado.', 'Extra saved.') }
}
