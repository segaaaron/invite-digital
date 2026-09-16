import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import type { Allowance } from '../domain/allowance'
import { filasComparativas, type TextosComparativa } from '../domain/comparativa'

/** Los textos del panel, que es solo español. La web usa los de su diccionario. */
export const TEXTOS_DEL_PANEL: TextosComparativa = {
  si: 'Sí',
  no: 'No',
  sinLimite: 'Sin límite',
  hasta: 'Hasta {n}',
  dias: '{n} días',
  filas: {
    grupos: 'Invitaciones',
    fotos: 'Fotos del evento',
    fotosInvitados: 'Fotos de los invitados',
    contrasena: 'Invitación con contraseña',
    csv: 'Importar la lista de un CSV',
    mesas: 'Mesas y plano del salón',
    regalos: 'Mesa de regalos y fondos',
    puerta: 'Modo puerta con QR',
    porteros: 'Porteros',
    coanfitriones: 'Co-anfitriones',
    planners: 'Planner contratado',
    tareas: 'Plan de tareas y presupuesto',
    plannerCompleto: 'Proveedores, cronograma y cortejo',
    plannerTotal: 'Día D y enlaces para proveedores',
    enLinea: 'En línea tras el evento',
    modelo: 'Cambiar de modelo',
  },
  modelo: { ninguno: 'No', antes_de_repartir: 'Hasta repartir enlaces', siempre: 'Siempre' },
}

/**
 * Una tarjeta por plan, con **cada límite** listado y su respuesta al lado, generado desde
 * el plan. Enseñar solo lo incluido obligaría a comparar tarjetas para deducir lo que
 * falta, que es justo lo que hay que decidir aquí.
 */
/**
 * El precio, en la moneda del catálogo. Se compone a partir de la cadena decimal y nunca
 * de un `parseFloat` sobre los centavos: `1234.5 * 100` no vuelve a dar 123450.
 */
function formatPrice(cents: number, currency: string): string {
  const entero = Math.trunc(cents / 100)
  const decimal = String(Math.abs(cents % 100)).padStart(2, '0')
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency, minimumFractionDigits: 2 }).format(
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
  return (
    <article
      className={`flex flex-col gap-4 rounded-[18px] border bg-linear-to-b from-bg-top to-white p-6 shadow-card ${
        current ? 'border-gold' : 'border-line-panel'
      }`}
      aria-label={`Plan ${name}`}
    >
      <header className="flex flex-col gap-1">
        {current ? (
          <p className="font-mono text-[9px] tracking-[0.35em] text-gold-deep uppercase">Plan actual</p>
        ) : null}
        <h3 className="font-display text-[22px] font-light italic text-ink">{name}</h3>
      </header>

      {price === undefined ? null : (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-[34px] leading-none font-light text-ink [font-variant-numeric:lining-nums]">
            {formatPrice(billing === 'annual' && price.annualCents !== null ? price.annualCents : price.cents, price.currency)}
          </span>
          <span className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
            {billing === 'annual' && price.annualCents !== null ? 'al año' : 'por evento'}
          </span>
        </p>
      )}

      <ul className="flex flex-col">
        {filasComparativas([plan], TEXTOS_DEL_PANEL).map((fila) => {
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
            Plan actual
          </p>
        ) : changeHref === undefined ? null : (
          <PanelButton className="w-full" href={changeHref} variant="primary">
            Cambiar a {name}
          </PanelButton>
        )}
      </div>
    </article>
  )
}
