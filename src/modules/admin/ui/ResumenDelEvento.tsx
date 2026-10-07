import Link from 'next/link'
import { EyeIcon, WhatsAppIcon } from '@/shared/design/ui/icons'
import { EtiquetaDeFiesta, Semaforo, type FiestaDeLista, type TonoDeSalud } from '@/shared/design/ui/panel/lista'
import { botonClases } from '@/shared/design/ui/panel/PanelKit'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import { DuplicarEvento } from './DuplicarEvento'
import type { Anfitrion } from './SoporteDeBoda'

/**
 * **El resumen de la ficha del evento**, lo primero que ve el admin: la fiesta, la fecha con su
 * cuenta atrás, el diseño y el plan, quién es el cliente y **la salud del evento con sus razones**.
 * Y a mano: ver la invitación, escribirle o entrar como él. El resto de la ficha es para cambiar.
 */
export function ResumenDelEvento({
  eventId,
  slug,
  fiesta,
  fecha,
  cuando,
  tema,
  planNombre,
  anfitriones,
  salud,
  confirmaciones,
}: {
  eventId: string
  slug: string
  fiesta: FiestaDeLista
  /** «sáb 12 oct 2026», ya formateada. */
  fecha: string
  /** «en 14 días». */
  cuando: string
  tema: string
  planNombre: string | null
  anfitriones: readonly Anfitrion[]
  salud: { readonly tono: TonoDeSalud; readonly texto: string; readonly alertas: readonly { readonly clave: string; readonly tono: TonoDeSalud; readonly texto: string }[] } | null
  confirmaciones: { readonly respondidos: number; readonly grupos: number } | null
}) {
  const conTelefono = anfitriones.find((a) => (a.phone ?? '') !== '')
  const whatsapp = conTelefono?.phone ? enlaceWhatsapp(conTelefono.phone, 'Hola, te escribimos de Luxury Atelier por tu evento.') : null
  return (
    <section className="mb-6 overflow-hidden rounded-[22px] border border-line-panel bg-white/85 shadow-card">
      <div className="grid gap-5 p-5 min-[900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] min-[900px]:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <EtiquetaDeFiesta fiesta={fiesta} />
            <span className="font-mono text-[10px] tracking-[0.16em] text-ink-mute uppercase">{tema}</span>
          </div>
          <p className="font-display text-[26px] leading-tight text-ink first-letter:uppercase">{fecha}</p>
          <p className="text-[13px] text-ink-soft first-letter:uppercase">
            {cuando} · plan {planNombre ?? 'sin asignar'}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase">Salud</span>
          {salud === null ? (
            <span className="text-[13px] text-ink-mute">—</span>
          ) : salud.alertas.length === 0 ? (
            <Semaforo tono={salud.tono}>{salud.texto}</Semaforo>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {salud.alertas.map((a) => (
                <li key={a.clave}>
                  <Semaforo tono={a.tono}>{a.texto}</Semaforo>
                </li>
              ))}
            </ul>
          )}
          {confirmaciones === null || confirmaciones.grupos === 0 ? null : (
            <span className="text-[12px] text-ink-mute">
              Respondieron {confirmaciones.respondidos} de {confirmaciones.grupos} invitaciones
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase">Cliente</span>
          <span className="truncate text-[14px] text-ink">{anfitriones[0]?.email ?? 'Sin acceso · lo llevas tú'}</span>
          {anfitriones.length > 1 ? <span className="text-[12px] text-ink-mute">y {anfitriones.length - 1} más</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line-panel bg-bg-top/60 px-5 py-3 min-[900px]:px-6">
        <Link className={botonClases()} href={`/panel/eventos/${slug}/vista-previa`}>
          <EyeIcon className="size-4" /> Ver la invitación
        </Link>
        {whatsapp === null ? null : (
          <a className={botonClases()} href={whatsapp} rel="noopener noreferrer" target="_blank">
            <WhatsAppIcon className="size-4" /> Escribir al cliente
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        )}
        {/* «Entrar al panel» vive una sola vez, arriba de la ficha (en el layout): aquí se repetía. */}
        {/* Mismo diseño, plan y fecha, sin invitados: la civil y la religiosa, o la familia que vuelve. */}
        <DuplicarEvento eventId={eventId} />
      </div>
    </section>
  )
}
