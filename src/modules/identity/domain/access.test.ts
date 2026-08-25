import { describe, expect, it } from 'vitest'
import { canAccessEvent, canDeleteUser, canDemote, canManageStaff, isAdmin, parseRole, type Actor } from './access'

const atelier: Actor = { userId: 'u1', email: 'a@ejemplo.bo', role: 'atelier' }
const otro: Actor = { userId: 'u2', email: 'b@ejemplo.bo', role: 'atelier' }
const admin: Actor = { userId: 'u3', email: 'jefe@ejemplo.bo', role: 'admin' }

describe('canAccessEvent', () => {
  it('el dueño entra en su evento', () => {
    expect(canAccessEvent(atelier, { userId: 'u1' })).toBe(true)
  })

  it('otro atelier no entra en el evento ajeno', () => {
    expect(canAccessEvent(otro, { userId: 'u1' })).toBe(false)
  })

  it('el admin entra en cualquiera: es lo que hace falta para dar soporte', () => {
    expect(canAccessEvent(admin, { userId: 'u1' })).toBe(true)
  })

  it('un evento sin dueño solo lo ve el admin', () => {
    // No debería existir ninguno —la migración 0021 los asignó todos—, pero la columna
    // es anulable y «sin dueño» no puede significar «de cualquiera».
    expect(canAccessEvent(atelier, { userId: null })).toBe(false)
    expect(canAccessEvent(admin, { userId: null })).toBe(true)
  })
})

describe('parseRole', () => {
  it('reconoce los dos roles', () => {
    expect(parseRole('admin')).toBe('admin')
    expect(parseRole('atelier')).toBe('atelier')
  })

  it('cualquier otra cosa es el rol de menos poder, no un error', () => {
    // Una fila con un rol desconocido —una migración a medias— no puede conceder nada.
    expect(parseRole('superusuario')).toBe('atelier')
    expect(parseRole(null)).toBe('atelier')
  })
})

describe('isAdmin', () => {
  it('distingue los dos roles', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(atelier)).toBe(false)
  })
})

describe('canDemote', () => {
  it('un admin no se quita el rol a sí mismo', () => {
    // Quitárselo deja el sistema sin forma de volver a entrar a administrarlo.
    expect(canDemote(admin, { userId: 'u3', adminCount: 3 })).toBe(false)
  })

  it('ni se degrada al último admin que queda', () => {
    expect(canDemote(admin, { userId: 'otro-admin', adminCount: 1 })).toBe(false)
  })

  it('con más de un admin, se degrada a otro', () => {
    expect(canDemote(admin, { userId: 'otro-admin', adminCount: 2 })).toBe(true)
  })
})

describe('canDeleteUser', () => {
  it('un usuario con eventos no se borra: sus bodas se irían con él', () => {
    expect(canDeleteUser(admin, { userId: 'u1', eventos: 3, targetIsAdmin: false, adminCount: 2 })).toEqual({
      ok: false,
      reason: 'tiene_eventos',
    })
  })

  it('un admin no se borra a sí mismo', () => {
    expect(canDeleteUser(admin, { userId: 'u3', eventos: 0, targetIsAdmin: true, adminCount: 2 })).toEqual({
      ok: false,
      reason: 'es_uno_mismo',
    })
  })

  it('ni se borra al último admin', () => {
    expect(canDeleteUser(admin, { userId: 'otro-admin', eventos: 0, targetIsAdmin: true, adminCount: 1 })).toEqual({
      ok: false,
      reason: 'ultimo_admin',
    })
  })

  it('pero borrar a un atelier con un solo admin en el sistema es normal', () => {
    // La primera versión lo bloqueaba: el tope de admins se comprobaba sin mirar si el
    // que se iba era admin.
    expect(canDeleteUser(admin, { userId: 'u1', eventos: 0, targetIsAdmin: false, adminCount: 1 })).toEqual({ ok: true })
  })

  it('un usuario sin eventos se borra', () => {
    expect(canDeleteUser(admin, { userId: 'u1', eventos: 0, targetIsAdmin: false, adminCount: 2 })).toEqual({ ok: true })
  })
})

describe('canAccessEvent · el personal de puerta', () => {
  const puerta: Actor = { userId: 'p1', email: 'puerta@ejemplo.bo', role: 'puerta' }
  const evento = { userId: 'u1' }

  it('abre el check-in del evento donde es personal', () => {
    expect(canAccessEvent(puerta, evento, { section: 'checkin', isStaff: true })).toBe(true)
  })

  it('no abre nada más de ese mismo evento', () => {
    // Ser personal de una boda no abre la lista de invitados de esa boda.
    expect(canAccessEvent(puerta, evento, { section: 'full', isStaff: true })).toBe(false)
  })

  it('ni el check-in de un evento donde no lo es', () => {
    expect(canAccessEvent(puerta, evento, { section: 'checkin', isStaff: false })).toBe(false)
  })

  it('sin decir la sección, hereda «full» y queda fuera', () => {
    // El olvido cae del lado seguro: una página nueva que no diga su sección deniega.
    expect(canAccessEvent(puerta, evento, { isStaff: true })).toBe(false)
    expect(canAccessEvent(puerta, evento)).toBe(false)
  })

  it('el dueño y el admin no se ven afectados por la sección', () => {
    expect(canAccessEvent(atelier, { userId: 'u1' }, { section: 'checkin' })).toBe(true)
    expect(canAccessEvent(admin, { userId: 'u1' }, { section: 'full' })).toBe(true)
  })
})

describe('canManageStaff', () => {
  it('el dueño del evento da de alta a su gente de puerta', () => {
    expect(canManageStaff(atelier, { userId: 'u1' })).toBe(true)
  })

  it('otro atelier no', () => {
    expect(canManageStaff(otro, { userId: 'u1' })).toBe(false)
  })

  it('el admin sí, porque puede todo', () => {
    expect(canManageStaff(admin, { userId: 'u1' })).toBe(true)
  })

  it('y el propio personal de puerta no se añade compañeros', () => {
    const puerta: Actor = { userId: 'p1', email: 'p@ejemplo.bo', role: 'puerta' }

    expect(canManageStaff(puerta, { userId: 'p1' })).toBe(false)
  })
})
