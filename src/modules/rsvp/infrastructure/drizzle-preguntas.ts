import { eq, sql } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { eventRsvpQuestions } from '@/shared/db/schema'
import { SIN_PREGUNTAS, type PreguntasDelRsvp, type ResultadosDePreguntas } from '../domain/preguntas'


/** Las preguntas al confirmar de cada evento, y lo que contestaron (`0085`). */
export const drizzlePreguntas = {
  async leer(eventId: string): Promise<PreguntasDelRsvp> {
    const [f] = await db.select().from(eventRsvpQuestions).where(eq(eventRsvpQuestions.eventId, eventId)).limit(1)
    return f === undefined ? SIN_PREGUNTAS : { cancion: f.askSong, menus: f.menus, actos: f.acts }
  },

  async guardar(eventId: string, p: PreguntasDelRsvp): Promise<void> {
    const valores = { askSong: p.cancion, menus: [...p.menus], acts: [...p.actos], updatedAt: sql`now()` }
    await db
      .insert(eventRsvpQuestions)
      .values({ eventId, ...valores })
      .onConflictDoUpdate({ target: eventRsvpQuestions.eventId, set: valores })
  },

  /**
   * Lo contestado, mirando **la última respuesta** de cada invitación que viene: quien cambió de
   * opinión cuenta con lo último que dijo, y quien no viene no pide canción ni menú.
   */
  async resultados(eventId: string): Promise<ResultadosDePreguntas> {
    const filas = (await db.execute(sql`
      select distinct on (r.guest_group_id) g.label, r.song, r.menu, r.acts, r.attending
      from rsvp_responses r join guest_groups g on g.id = r.guest_group_id
      where g.event_id = ${eventId} and g.revoked_at is null
      order by r.guest_group_id, r.responded_at desc`)) as unknown as Array<{ label: string; song: string | null; menu: string | null; acts: string[] | null; attending: number }>
    const vienen = filas.filter((f) => f.attending > 0)
    const contar = (valores: string[]) => [...valores.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<string, number>())].map(([opcion, veces]) => ({ opcion, veces }))
    return {
      canciones: vienen.flatMap((f) => (f.song === null ? [] : [{ cancion: f.song, invitacion: f.label }])),
      menus: contar(vienen.flatMap((f) => (f.menu === null ? [] : [f.menu]))),
      actos: contar(vienen.flatMap((f) => f.acts ?? [])),
    }
  },
}
