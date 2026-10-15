'use client'

import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'
import type { Locale } from '@/shared/i18n/locales'
import { INTL, type T } from '@/shared/i18n/t'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import type { Allowance } from '../domain/allowance'
import { filasComparativas, type TextosComparativa } from '../domain/comparativa'

/** Los textos del panel, en el idioma de quien mira. La web usa los de su diccionario. */
export const textosDelPanel = (t: T): TextosComparativa => ({
  si: t('Sí', 'Yes'),
  no: t('No', 'No'),
  sinLimite: t('Sin límite', 'Unlimited'),
  hasta: t('Hasta {n}', 'Up to {n}'),
  dias: t('{n} días', '{n} days'),
  filas: {
    grupos: t('Invitaciones', 'Invitations'),
    fotos: t('Fotos del evento', 'Event photos'),
    fotosInvitados: t('Fotos de los invitados', 'Guest photos'),
    contrasena: t('Invitación con contraseña', 'Password-protected invitation'),
    csv: t('Importar la lista de un CSV', 'Import the list from a CSV'),
    mesas: t('Mesas y plano del salón', 'Tables and floor plan'),
    regalos: t('Mesa de regalos y fondos', 'Gift registry and funds'),
    formas: t('Lluvia de sobres y QR de transferencia', 'Envelope gifts and transfer QR'),
    libro: t('Libro de firmas', 'Guestbook'),
    estilo: t('Colores y letra a tu gusto', 'Your own colours and fonts'),
    puerta: t('Modo puerta con QR', 'QR door mode'),
    porteros: t('Recepción', 'Reception'),
    planners: t('Planner contratado', 'Hired planner'),
    tareas: t('Plan de tareas y presupuesto', 'Task plan and budget'),
    plannerCompleto: t('Proveedores, cronograma y cortejo', 'Vendors, schedule and wedding party'),
    plannerTotal: t('Día D y enlaces para proveedores', 'Big day and vendor links'),
    enLinea: t('En línea tras el evento', 'Online after the event'),
    modelo: t('Cambiar de modelo', 'Change design'),
  },
  modelo: { ninguno: t('No', 'No'), antes_de_repartir: t('Hasta repartir enlaces', 'Until links are sent'), siempre: t('Siempre', 'Always') },
})

/**
 * Una tarjeta por plan, con **cada límite** listado y su respuesta al lado, generado desde
 * el plan. Enseñar solo lo incluido obligaría a comparar tarjetas para deducir lo que
 * falta, que es justo lo que hay que decidir aquí.
 */
/**
 * El precio, en la moneda del catálogo. Se compone a partir de la cadena decimal y nunca
 * de un `parseFloat` sobre los centavos: `1234.5 * 100` no vuelve a dar 123450.
 */
function formatPrice(cents: number, currency: string, locale: Locale): string {
  const entero = Math.trunc(cents / 100)
  const decimal = String(Math.abs(cents % 100)).padStart(2, '0')
  return new Intl.NumberFormat(INTL[locale], { style: 'currency', currency, minimumFractionDigits: 2 }).format(
    Number(`${entero}.${decimal}`),
  )
}

export type PlanPrice = {
  readonly cents: number
  readonly annualCents: number | null
  readonly currency: string
}

/**
 * ¿Este plan tiene precio anual?
 *
 * No se anuncia porcentaje de ahorro. El «AHORRA 17 %» de la maqueta comparaba el precio
 * **por evento** multiplicado por doce con el anual: solo sería cierto para quien celebre
 * doce bodas al año, y prometer un ahorro que nadie va a tener es publicidad engañosa. Se
 * enseñan los dos precios y que cada cual haga su cuenta.
 */
export function hasAnnual(price: PlanPrice): boolean {
  return price.annualCents !== null
}

export function PlanCard({
  plan,
  name,
  current,
  price,
  billing = 'once',
  changeHref,
}: {
  plan: Allowance
  name: string
  current: boolean
  price?: PlanPrice | undefined
  /** `once` es el pago por evento; `annual` solo existe si el plan tiene precio anual. */
  billing?: 'once' | 'annual' | undefined
  /** Adónde lleva «Cambiar a…». Sin él la tarjeta solo informa. */
  changeHref?: string | undefined
}) {
  const t = useT()
  const locale = useIdioma()
  return (
    <article
      className={`flex flex-col gap-4 rounded-[18px] border bg-linear-to-b from-bg-top to-white p-6 shadow-card ${
        current ? 'border-gold' : 'border-line-panel'
      }`}
      aria-label={`Plan ${name}`}
    >
      <header className="flex flex-col gap-1">
        {current ? (
          <p className="font-mono text-[10.5px] tracking-[0.18em] text-gold-deep uppercase">{t('Plan actual', 'Current plan')}</p>
        ) : null}
        <h3 className="font-display text-[22px] font-light italic text-ink">{name}</h3>
      </header>

      {price === undefined ? null : (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-[34px] leading-none font-light text-ink [font-variant-numeric:lining-nums]">
            {formatPrice(billing === 'annual' && price.annualCents !== null ? price.annualCents : price.cents, price.currency, locale)}
          </span>
          <span className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
            {billing === 'annual' && price.annualCents !== null ? t('al año', 'per year') : t('por evento', 'per event')}
          </span>
        </p>
      )}

      <ul className="flex flex-col">
        {filasComparativas([plan], textosDelPanel(t)).map((fila) => {
          const celda = fila.valores[0]!
          return (
            <li
              aria-label={fila.etiqueta}
              className="flex items-center justify-between gap-3 border-b border-line-panel py-2.5 text-[13px] text-ink-mute last:border-none"
              key={fila.clave}
            >
              <span>{fila.etiqueta}</span>
              <span className={celda.incluido ? 'text-ink' : 'text-ink-mute/60'}>{celda.texto}</span>
            </li>
          )
        })}
      </ul>

      {/* El pie de la maqueta: una llamada por tarjeta, y la actual sin nada que pulsar. */}
      <div className="mt-auto pt-2">
        {current ? (
          <p className="rounded-[var(--radius-pill)] border border-line-panel py-2.5 text-center font-mono text-[10px] tracking-[0.25em] text-ink-mute uppercase">
            {t('Plan actual', 'Current plan')}
          </p>
        ) : changeHref === undefined ? null : (
          <PanelButton className="w-full" href={changeHref} variant="primary">
            {t(`Cambiar a ${name}`, `Switch to ${name}`)}
          </PanelButton>
        )}
      </div>
    </article>
  )
}
