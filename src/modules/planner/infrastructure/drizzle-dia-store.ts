import { and, asc, eq, inArray } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { courtMembers, eventDocuments, rehearsalAttendees, rehearsals, runOfShow, vendors } from '@/shared/db/schema'
import type { DiaStore } from '../application/dia-ports'
import type { TipoDeDocumento } from '../domain/dia-d'
import type { EstadoDeProveedor, TipoDeCortejo } from '../domain/equipo-del-dia'

type FilaProveedor = typeof vendors.$inferSelect

const proveedor = (f: FilaProveedor) => ({
  id: f.id,
  service: f.service,
  company: f.company,
  contactName: f.contactName,
  whatsapp: f.whatsapp,
  email: f.email,
  status: f.status as EstadoDeProveedor,
  arrivalTime: f.arrivalTime,
  setupNotes: f.setupNotes,
  budgetItemId: f.budgetItemId,
  conEnlace: f.accessTokenHash !== null,
  arrivedAt: f.arrivedAt,
})

export function createDrizzleDiaStore(database: DbExecutor = db): DiaStore {

  return {
    async listVendors(eventId) {
      const filas = await database.select().from(vendors).where(eq(vendors.eventId, eventId)).orderBy(asc(vendors.createdAt))
      return filas.map(proveedor)
    },
    async insertVendor(eventId, v) {
      const [fila] = await database.insert(vendors).values({ ...v, eventId }).returning({ id: vendors.id })
      return fila!.id
    },
    async updateVendor(eventId, id, patch) {
      const filas = await database.update(vendors).set(patch).where(and(eq(vendors.id, id), eq(vendors.eventId, eventId))).returning({ id: vendors.id })
      return filas.length > 0
    },
    async removeVendor(eventId, id) {
      const filas = await database.delete(vendors).where(and(eq(vendors.id, id), eq(vendors.eventId, eventId))).returning({ id: vendors.id })
      return filas.length > 0
    },
    async setVendorToken(eventId, id, hash) {
      const filas = await database.update(vendors).set({ accessTokenHash: hash }).where(and(eq(vendors.id, id), eq(vendors.eventId, eventId))).returning({ id: vendors.id })
      return filas.length > 0
    },
    async setVendorArrived(eventId, id, at) {
      const filas = await database.update(vendors).set({ arrivedAt: at }).where(and(eq(vendors.id, id), eq(vendors.eventId, eventId))).returning({ id: vendors.id })
      return filas.length > 0
    },
    async findVendorByTokenHash(hash) {
      const [fila] = await database.select().from(vendors).where(eq(vendors.accessTokenHash, hash)).limit(1)
      return fila ? { vendor: proveedor(fila), eventId: fila.eventId } : null
    },

    async listMoments(eventId) {
      const filas = await database.select().from(runOfShow).where(eq(runOfShow.eventId, eventId)).orderBy(asc(runOfShow.sortOrder), asc(runOfShow.createdAt))
      return filas.map((f) => ({
        id: f.id,
        startsAt: f.startsAt,
        durationMin: f.durationMin,
        title: f.title,
        place: f.place,
        owner: f.owner,
        vendorIds: f.vendorIds,
        cue: f.cue,
        notes: f.notes,
        sortOrder: f.sortOrder,
        enInvitacion: f.inInvitation,
        icono: f.icon,
      }))
    },
    async insertMoments(eventId, momentos) {
      if (momentos.length === 0) return
      await database.insert(runOfShow).values(momentos.map(({ enInvitacion, icono, ...m }) => ({ ...m, inInvitation: enInvitacion, icon: icono, vendorIds: [...m.vendorIds], eventId })))
    },
    async updateMoment(eventId, id, { enInvitacion, icono, ...m }) {
      const filas = await database
        .update(runOfShow)
        .set({ ...m, inInvitation: enInvitacion, icon: icono, vendorIds: [...m.vendorIds] })
        .where(and(eq(runOfShow.id, id), eq(runOfShow.eventId, eventId)))
        .returning({ id: runOfShow.id })
      return filas.length > 0
    },
    async removeMoment(eventId, id) {
      const filas = await database.delete(runOfShow).where(and(eq(runOfShow.id, id), eq(runOfShow.eventId, eventId))).returning({ id: runOfShow.id })
      return filas.length > 0
    },

    async listCourt(eventId) {
      const filas = await database.select().from(courtMembers).where(eq(courtMembers.eventId, eventId)).orderBy(asc(courtMembers.createdAt))
      return filas.map((f) => ({
        id: f.id,
        kind: f.kind as TipoDeCortejo,
        name: f.name,
        whatsapp: f.whatsapp,
        sponsors: f.sponsors,
        size: f.size,
        confirmed: f.confirmed,
        budgetItemId: f.budgetItemId,
      }))
    },
    async insertCourtMember(eventId, m) {
      await database.insert(courtMembers).values({ ...m, eventId })
    },
    async updateCourtMember(eventId, id, patch) {
      const filas = await database.update(courtMembers).set(patch).where(and(eq(courtMembers.id, id), eq(courtMembers.eventId, eventId))).returning({ id: courtMembers.id })
      return filas.length > 0
    },
    async removeCourtMember(eventId, id) {
      const filas = await database.delete(courtMembers).where(and(eq(courtMembers.id, id), eq(courtMembers.eventId, eventId))).returning({ id: courtMembers.id })
      return filas.length > 0
    },

    async listRehearsals(eventId) {
      const filas = await database.select().from(rehearsals).where(eq(rehearsals.eventId, eventId)).orderBy(asc(rehearsals.date))
      const asistentes =
        filas.length === 0 ? [] : await database.select().from(rehearsalAttendees).where(inArray(rehearsalAttendees.rehearsalId, filas.map((f) => f.id)))
      return filas.map((f) => ({
        id: f.id,
        date: f.date,
        place: f.place,
        notes: f.notes,
        asistentes: asistentes.filter((a) => a.rehearsalId === f.id).map((a) => a.courtMemberId),
      }))
    },
    async insertRehearsal(eventId, ensayo) {
      await database.transaction(async (tx) => {
        const [fila] = await tx.insert(rehearsals).values({ eventId, date: ensayo.date, place: ensayo.place, notes: ensayo.notes }).returning({ id: rehearsals.id })
        if (ensayo.asistentes.length === 0) return
        // Solo los del cortejo de **este** evento: un id ajeno no se cuela como asistente.
        const validos = await tx
          .select({ id: courtMembers.id })
          .from(courtMembers)
          .where(and(eq(courtMembers.eventId, eventId), inArray(courtMembers.id, [...ensayo.asistentes])))
        if (validos.length > 0) await tx.insert(rehearsalAttendees).values(validos.map((v) => ({ rehearsalId: fila!.id, courtMemberId: v.id })))
      })
    },
    async listDocuments(eventId) {
      const filas = await database.select().from(eventDocuments).where(eq(eventDocuments.eventId, eventId)).orderBy(asc(eventDocuments.createdAt))
      return filas.map((f) => ({
        id: f.id,
        kind: f.kind as TipoDeDocumento,
        topic: f.topic,
        originalName: f.originalName,
        contentType: f.contentType,
        byteSize: f.byteSize,
        vendorId: f.vendorId,
        budgetItemId: f.budgetItemId,
        createdAt: f.createdAt,
      }))
    },
    async insertDocument(eventId, doc) {
      await database.insert(eventDocuments).values({ ...doc, eventId })
    },
    async removeDocument(eventId, id) {
      const filas = await database.delete(eventDocuments).where(and(eq(eventDocuments.id, id), eq(eventDocuments.eventId, eventId))).returning({ id: eventDocuments.id })
      return filas.length > 0
    },
    async removeRehearsal(eventId, id) {
      const filas = await database.delete(rehearsals).where(and(eq(rehearsals.id, id), eq(rehearsals.eventId, eventId))).returning({ id: rehearsals.id })
      return filas.length > 0
    },
  }
}

export const drizzleDiaStore = createDrizzleDiaStore()
