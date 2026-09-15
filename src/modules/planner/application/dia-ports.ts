import type { Momento } from '../domain/cronograma'
import type { TipoDeDocumento } from '../domain/dia-d'
import type { Ensayo, MiembroDelCortejo, Proveedor, ProveedorLimpio, TipoDeCortejo } from '../domain/equipo-del-dia'

export type MomentoInput = Omit<Momento, 'id' | 'sortOrder'>
export type MiembroInput = Omit<MiembroDelCortejo, 'id' | 'budgetItemId'> & { budgetItemId: string | null }

/** El día del evento: proveedores, cronograma, cortejo y ensayos. Todo con su `eventId`. */
export interface DiaStore {
  listVendors(eventId: string): Promise<Proveedor[]>
  insertVendor(eventId: string, vendor: ProveedorLimpio & { budgetItemId: string | null }): Promise<string>
  updateVendor(eventId: string, id: string, patch: Partial<ProveedorLimpio & { budgetItemId: string | null }>): Promise<boolean>
  removeVendor(eventId: string, id: string): Promise<boolean>
  setVendorToken(eventId: string, id: string, hash: Buffer | null): Promise<boolean>
  setVendorArrived(eventId: string, id: string, at: Date | null): Promise<boolean>
  /** El proveedor de un enlace, con el evento al que pertenece. */
  findVendorByTokenHash(hash: Buffer): Promise<{ vendor: Proveedor; eventId: string } | null>

  listMoments(eventId: string): Promise<Momento[]>
  insertMoments(eventId: string, momentos: ReadonlyArray<MomentoInput & { sortOrder: number }>): Promise<void>
  updateMoment(eventId: string, id: string, momento: MomentoInput): Promise<boolean>
  removeMoment(eventId: string, id: string): Promise<boolean>

  listCourt(eventId: string): Promise<MiembroDelCortejo[]>
  insertCourtMember(eventId: string, miembro: MiembroInput): Promise<void>
  updateCourtMember(eventId: string, id: string, patch: Partial<MiembroInput>): Promise<boolean>
  removeCourtMember(eventId: string, id: string): Promise<boolean>

  listRehearsals(eventId: string): Promise<Ensayo[]>
  /** Crea el ensayo con sus asistentes; solo cuentan los del cortejo de este evento. */
  insertRehearsal(eventId: string, ensayo: { date: Date; place: string | null; notes: string | null; asistentes: readonly string[] }): Promise<void>
  removeRehearsal(eventId: string, id: string): Promise<boolean>

  listDocuments(eventId: string): Promise<Documento[]>
  insertDocument(eventId: string, doc: Omit<Documento, 'createdAt'>): Promise<void>
  removeDocument(eventId: string, id: string): Promise<boolean>
}

export type Documento = {
  readonly id: string
  readonly kind: TipoDeDocumento
  readonly topic: string | null
  readonly originalName: string
  readonly contentType: string
  readonly byteSize: number
  readonly vendorId: string | null
  readonly budgetItemId: string | null
  readonly createdAt: Date
}

export type { TipoDeCortejo }
