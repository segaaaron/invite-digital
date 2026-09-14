import { describe, expect, it } from 'vitest'
import {
  canAccessEvent,
  canDeleteUser,
  canDemote,
  canManageStaff,
  isAdmin,
  parseRole,
  sectionForRole,
  type Actor,
} from './access'

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
  it('reconoce los cuatro roles', () => {
    expect(parseRole('admin')).toBe('admin')
    expect(parseRole('atelier')).toBe('atelier')
    expect(parseRole('puerta')).toBe('puerta')
    expect(parseRole('cliente')).toBe('cliente')
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

describe('canAccessEvent · el cliente', () => {
  const cliente: Actor = { userId: 'c1', email: 'novios@ejemplo.bo', role: 'cliente' }
  const evento = { userId: 'u1' }

  it('entra en la sección del cliente del evento donde está dado de alta', () => {
    expect(canAccessEvent(cliente, evento, { section: 'cliente', isStaff: true })).toBe(true)
  })

  it('no entra en el evento donde no lo está', () => {
    // La pertenencia es por boda: ser cliente de una no abre la de otro.
    expect(canAccessEvent(cliente, evento, { section: 'cliente', isStaff: false })).toBe(false)
  })

  it('no abre la sección completa, ni siendo de ese evento', () => {
    // `full` es Configuración, el plan y el borrado del evento: eso es del atelier que
    // vendió la boda, no de quien la celebra.
    expect(canAccessEvent(cliente, evento, { section: 'full', isStaff: true })).toBe(false)
  })

  it('ni el check-in: la puerta es otro oficio', () => {
    expect(canAccessEvent(cliente, evento, { section: 'checkin', isStaff: true })).toBe(false)
  })

  it('sin decir la sección, hereda «full» y queda fuera', () => {
    // Una página nueva que no declare su sección deniega al cliente. El olvido cae del
    // lado seguro, igual que con el personal de puerta.
    expect(canAccessEvent(cliente, evento, { isStaff: true })).toBe(false)
    expect(canAccessEvent(cliente, evento)).toBe(false)
  })

  it('el dueño del evento entra igual en la sección del cliente', () => {
    // El atelier ve todo lo que ve su cliente; al revés no.
    expect(canAccessEvent(atelier, { userId: 'u1' }, { section: 'cliente' })).toBe(true)
    expect(canAccessEvent(admin, { userId: 'u1' }, { section: 'cliente' })).toBe(true)
  })

  it('y otro cliente no entra por tener el rol', () => {
    const ajeno: Actor = { userId: 'c2', email: 'otros@ejemplo.bo', role: 'cliente' }

    expect(canAccessEvent(ajeno, evento, { section: 'cliente', isStaff: false })).toBe(false)
  })
})

describe('sectionForRole', () => {
  it('cada rol pide la sección con la que puede entrar a la carcasa del evento', () => {
    // La carcasa de `(gestion)` envuelve al check-in, al cliente y al atelier. Pidiendo
    // una sola sección fija dejaría fuera a dos de los tres antes de llegar a su propia
    // pantalla; el corte fino lo hace cada página.
    expect(sectionForRole('cliente')).toBe('cliente')
    expect(sectionForRole('puerta')).toBe('checkin')
    expect(sectionForRole('atelier')).toBe('full')
    expect(sectionForRole('admin')).toBe('full')
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
