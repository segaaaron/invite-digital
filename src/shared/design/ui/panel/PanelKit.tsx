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
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] uppercase transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0'

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
}: {
  label: string
  value: string
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
      <span className="w-10 shrink-0 text-right font-mono text-[11px] text-ink-soft">{value}</span>
    </div>
  )
}
