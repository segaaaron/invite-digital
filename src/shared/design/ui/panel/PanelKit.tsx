import Link from 'next/link'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

/**
 * La piel del panel, portada de `docs/design-reference/dashboard/Dashboard.html`.
 *
 * Existe porque cada vista se pintaba su propio botón a mano con clases sueltas, y así
 * el panel acabó con el dorado de la web pública donde la maqueta pone tinta oscura. Un
 * único sitio donde se decide cómo es un botón, una píldora o un chip: si vuelve a
 * desviarse, se desvía en un fichero, no en catorce.
 */

const BOTON_BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] whitespace-nowrap uppercase transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0'

const BOTON_VARIANTES = {
  /** La acción principal de la pantalla. Una por cabecera. */
  primary:
    'border border-shell-deep bg-linear-to-b from-shell to-shell-deep text-white shadow-[0_2px_8px_rgb(0_0_0/0.25),inset_0_1px_0_rgb(255_255_255/0.12)] hover:-translate-y-px hover:from-shell-deep hover:to-black',
  /** Todo lo demás: blanca con borde fino. */
  default:
    'border border-line-panel-strong bg-white text-ink shadow-[var(--shadow-card)] hover:-translate-y-px hover:border-ink',
  /** Lo que no se deshace. */
  danger: 'border border-danger/40 bg-white text-danger-deep hover:-translate-y-px hover:bg-danger-deep hover:text-white',
} as const

type PanelButtonProps = {
  children: ReactNode
  variant?: keyof typeof BOTON_VARIANTES
  href?: string
  /**
   * El destino sale de la aplicación —`https://wa.me/…`—. Va en un `<a>` normal, no en
   * `next/link`: prefetch y navegación de cliente no significan nada fuera del sitio, y
   * el enlace necesita `target` y `rel` propios.
   */
  external?: boolean
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export function PanelButton({
  children,
  variant = 'default',
  href,
  external = false,
  className = '',
  ...rest
}: PanelButtonProps) {
  const clases = `${BOTON_BASE} ${BOTON_VARIANTES[variant]} ${className}`.trim()

  if (href && external) {
    return (
      <a className={clases} href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    )
  }

  if (href) {
    return (
      <Link className={clases} href={href}>
        {children}
      </Link>
    )
  }

  return (
    <button className={clases} type="button" {...rest}>
      {children}
    </button>
  )
}

/**
 * Los campos de los diálogos y formularios del panel. Estaban copiados en cuatro
 * ficheros, y el rótulo va **fuera** del control a propósito: un `<label>` que envuelve a
 * su `<select>` mete el texto de todas las opciones en el nombre accesible del campo, y
 * ni un lector de pantalla ni una prueba lo encuentran por su nombre.
 */
/**
 * Un hueco de carga: la silueta de lo que va a llegar, no un disco girando.
 *
 * Existe aquí y no escrito a mano en cada pantalla por la misma razón que `Pill` o
 * `Field`: repartir rectángulos grises por las vistas es repartir catorce sitios donde
 * desviarse del gris de la casa.
 *
 * Es `bg-sunken`, el mismo relleno hundido del panel, y late despacio. Con movimiento
 * reducido se queda quieto —lo apaga el bloque de `globals.css`—: un pulso perpetuo en
 * media pantalla es exactamente lo que esa preferencia pide que no ocurra.
 *
 * Lleva `aria-hidden`: quien usa lector de pantalla no necesita que le describan cinco
 * rectángulos. Lo que anuncia la espera es el `role="status"` de quien lo coloca.
 */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-latido rounded-[10px] bg-bg-sunken ${className}`.trim()} />
}

/**
 * El esqueleto de una pantalla del panel: su cabecera y sus tarjetas.
 *
 * Tiene **la forma de lo que viene** —el rótulo mono, el título grande, las tarjetas con
 * su borde y su radio— porque un bloque gris genérico no dice que esté cargando *esto*;
 * dice que algo se rompió. `cards` es cuántas tarjetas esperar.
 */
export function PanelSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" role="status">
      <span className="sr-only">Cargando…</span>

      <header className="mb-6.5 flex flex-col gap-2.5">
        <SkeletonBlock className="h-2.5 w-24" />
        <SkeletonBlock className="h-8 w-64 max-w-full" />
      </header>

      <div className="grid gap-4.5 min-[900px]:grid-cols-2">
        {Array.from({ length: cards }, (_, i) => (
          <div
            className="min-w-0 rounded-[18px] border border-line-panel bg-linear-to-b from-bg-top to-white p-5.5 shadow-card"
            key={i}
          >
            <SkeletonBlock className="mb-4.5 h-3 w-32" />
            <div className="flex flex-col gap-2.5">
              <SkeletonBlock className="h-3.5 w-full" />
              <SkeletonBlock className="h-3.5 w-[88%]" />
              <SkeletonBlock className="h-3.5 w-[64%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * El aviso de un formulario: lo que salió mal, o que salió bien.
 *
 * Existe porque cada pantalla lo pintaba a mano y con su propio color —`text-danger` en
 * una, `text-gold-deep` en otra, un `text-sage` suelto para los aciertos—, así que el
 * mismo suceso se veía distinto según dónde ocurriera.
 *
 * **No es un toast flotante, y es decisión.** Un aviso que aparece en una esquina y se va
 * solo se pierde justo cuando importa: el que dice por qué no se guardó algo. Este vive
 * pegado a su formulario, donde está la mirada, y se queda hasta que se vuelve a intentar.
 *
 * `role="alert"` para el fallo —interrumpe al lector de pantalla, que es lo que toca
 * cuando algo no se hizo— y `role="status"` para el acierto, que no debe interrumpir.
 */
export function PanelAlert({ tone, children }: { tone: 'error' | 'ok'; children: ReactNode }) {
  const piel =
    tone === 'error'
      ? 'border-danger/30 bg-danger/8 text-danger-deep'
      : 'border-sage/35 bg-sage/10 text-sage-deep'

  return (
    <p
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`flex items-start gap-2.5 rounded-[12px] border px-3.5 py-2.5 text-[13px] leading-[1.6] ${piel}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {/* El símbolo acompaña; quien no distingue el color lee la palabra igual. */}
      <span aria-hidden className="mt-px font-mono text-[11px]">
        {tone === 'error' ? '!' : '✓'}
      </span>
      <span>{children}</span>
    </p>
  )
}

export const FIELD_CLASS =
  'w-full rounded-[14px] border border-line-panel-strong bg-white px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-ink'

export const LABEL_CLASS = 'font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase'

export function Field({ children, htmlFor, label }: { children: ReactNode; htmlFor: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label className={LABEL_CLASS} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}

const PILL_TONOS = {
  ok: 'bg-pill-ok text-pill-ok-ink',
  no: 'bg-pill-no text-pill-no-ink',
  pending: 'bg-pill-pending text-pill-pending-ink',
  maybe: 'bg-pill-maybe text-pill-maybe-ink',
} as const

export type PillTone = keyof typeof PILL_TONOS

/**
 * Estado en una palabra. El color acompaña al texto y nunca lo sustituye: quien no
 * distingue el verde del rojo lee «Asistirá» igual.
 */
export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-[var(--radius-pill)] px-2.5 py-1 font-mono text-[9px] tracking-[0.25em] whitespace-nowrap uppercase ${PILL_TONOS[tone]}`}
    >
      {children}
    </span>
  )
}

export function FilterChip({
  active = false,
  children,
  className = '',
  ...rest
}: { active?: boolean; children: ReactNode; className?: string } & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'children'
>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`cursor-pointer rounded-[var(--radius-pill)] border px-3.5 py-2 font-mono text-[10px] tracking-[0.25em] whitespace-nowrap uppercase transition-colors ${
        active ? 'border-ink bg-ink text-white' : 'border-line-panel-strong bg-white text-ink hover:border-ink'
      } ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}

/** El mismo chip, cuando el filtro vive en la URL: un enlace, no un botón. */
export function FilterChipLink({ active = false, href, children }: { active?: boolean; href: string; children: ReactNode }) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={`rounded-[var(--radius-pill)] border px-3.5 py-2 font-mono text-[10px] tracking-[0.25em] whitespace-nowrap uppercase transition-colors ${
        active ? 'border-ink bg-ink text-white' : 'border-line-panel-strong bg-white text-ink hover:border-ink'
      }`}
      href={href}
    >
      {children}
    </Link>
  )
}

/**
 * El buscador de la maqueta: píldora ancha sobre marfil. La etiqueta va oculta pero
 * existe, porque un `placeholder` desaparece al escribir y deja el campo sin nombre.
 */
export function SearchField({
  label,
  className = '',
  ...rest
}: { label: string; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  const id = useId()
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        className={`min-w-[200px] flex-1 rounded-[var(--radius-pill)] border border-line-panel-strong bg-bg-raised px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-mute ${className}`.trim()}
        {...rest}
      />
    </>
  )
}

/**
 * El mismo botón de icono, pero navegando.
 *
 * Lo que la maqueta abre con un `onclick` aquí se abre con un parámetro de la dirección
 * —`?panel=pase&persona=…`—, así que el control tiene que ser un enlace de verdad: se
 * puede abrir en otra pestaña, sobrevive a recargar y no depende de un `useState` que el
 * siguiente `revalidatePath` se llevaría por delante.
 */
export function IconLink({ label, href, children }: { label: string; href: string; children: ReactNode }) {
  return (
    <Link
      aria-label={label}
      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-line-panel bg-white text-[13px] transition-colors hover:border-ink"
      href={href}
      title={label}
    >
      <span aria-hidden>{children}</span>
    </Link>
  )
}

export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: { label: string; children: ReactNode; className?: string } & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'children'
>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-line-panel bg-white text-[13px] transition-colors hover:border-ink ${className}`.trim()}
      {...rest}
    >
      <span aria-hidden>{children}</span>
    </button>
  )
}

/**
 * Fila de barra de la maqueta: etiqueta, carril y cifra, los tres en la misma línea.
 * El carril mide siempre lo mismo, así que las barras se comparan entre sí de un
 * vistazo.
 */
export function BarRow({
  label,
  value,
  ratio,
  tone = 'sage',
  wide = false,
}: {
  label: string
  value: string
  /** Para importes: `Bs 1.450,00` no cabe en la columna de un recuento y se partía. */
  wide?: boolean
  /** 0..1. Se recorta: una barra al 140 % se sale de su carril. */
  ratio: number
  tone?: 'sage' | 'gold' | 'device'
}) {
  const ancho = Math.max(0, Math.min(1, ratio)) * 100

  return (
    <div className="flex items-center gap-3.5 py-1.5">
      <span className="w-[140px] shrink-0 truncate text-[13px] text-ink">{label}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-[var(--radius-pill)] bg-bg-sunken">
        <span
          data-barra
          className={`block h-full rounded-[var(--radius-pill)] ${
            tone === 'gold' ? 'bg-gold' : tone === 'device' ? 'bg-device' : 'bg-sage'
          }`}
          style={{ width: `${ancho}%` }}
        />
      </span>
      <span className={`${wide ? 'w-24' : 'w-10'} shrink-0 text-right font-mono text-[11px] whitespace-nowrap text-ink-soft`}>{value}</span>
    </div>
  )
}
