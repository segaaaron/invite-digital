import type { EstadoConsulta } from '../domain/pipeline'
import type { Consultation } from '../domain/consultation'

export interface ConsultationRepository {
  save(consultation: Consultation): Promise<void>
}

/** Una consulta tal como la ve el admin en su bandeja. */
export type ConsultationRow = {
  readonly id: string
  readonly name: string
  readonly email: string | null
  readonly phone: string | null
  readonly categorySlug: string | null
  readonly eventDate: string | null
  readonly message: string | null
  readonly locale: string
  readonly status: EstadoConsulta
  readonly note: string | null
  readonly statusChangedAt: Date | null
  readonly event: { readonly slug: string; readonly title: string } | null
  readonly createdAt: Date
}

/**
 * La bandeja del admin. Es un puerto **aparte** de `ConsultationRepository`: el formulario
 * público solo guarda, y no tiene por qué arrastrar lecturas ni cambios de estado.
 */
export interface ConsultationInbox {
  list(): Promise<ConsultationRow[]>
  find(id: string): Promise<ConsultationRow | null>
  /**
   * Escribe la transición **solo si sigue en `from`**, y dice si la escribió. Con dos
   * admins mirando la misma consulta, el segundo recibe `false` en vez de pisar al primero.
   */
  move(id: string, from: EstadoConsulta, patch: { status: EstadoConsulta; note: string | null; eventId: string | null; at: Date }): Promise<boolean>
  countNew(): Promise<number>
  /** Borra el dato personal de las consultas anteriores a `antesDe`. Devuelve cuántas. */
  anonymizeBefore(antesDe: Date): Promise<number>
}
