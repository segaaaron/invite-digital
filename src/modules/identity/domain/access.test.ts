import { describe, expect, it } from 'vitest'
import {
  canAccessEvent,
  canDeleteUser,
  canDemote,
  canManageStaff,
  gestionaElEvento,
  isAdmin,
  parseRole,
  sectionForRole,
  rolEnEquipo,
  type Actor,
  type EventSection,
  type Membership,
} from './access'

const atelier: Actor = { userId: 'u1', email: 'a@ejemplo.bo', role: 'atelier', mustChangePassword: false }
const otro: Actor = { userId: 'u2', email: 'b@ejemplo.bo', role: 'atelier', mustChangePassword: false }
const admin: Actor = { userId: 'u3', email: 'jefe@ejemplo.bo', role: 'admin', mustChangePassword: false }

describe('canAccessEvent', () => {
  it('el dueño entra en su evento', () => {
    expect(canAccessEvent(atelier, { userId: 'u1' })).toBe(true)
  })

  it('otro atelier no entra en el evento ajeno', () => {
    expect(canAccessEvent(otro, { userId: 'u1' })).toBe(false)
  })

  it('un evento sin dueño: ningún atelier entra, y el admin solo a la ficha', () => {
    // No debería existir ninguno —la migración 0021 los asignó todos—, pero la columna
    // es anulable y «sin dueño» no puede significar «de cualquiera».
    expect(canAccessEvent(atelier, { userId: null })).toBe(false)
    expect(canAccessEvent(admin, { userId: null }, { section: 'ficha' })).toBe(true)
  })
})

describe('canAccessEvent · el admin', () => {
  // La boda que creó el admin para un cliente: es su dueño y aun así no entra a los datos.
  const suya = { userId: 'u3' }
  const clienteActor: Actor = { userId: 'c1', email: 'novios@ejemplo.bo', role: 'cliente', mustChangePassword: false }

  it.each(['full', 'cliente', 'checkin', 'porteros', 'planner', 'equipo'] as const)('no entra a «%s»: los datos de la boda son del cliente', (section) => {
    expect(canAccessEvent(admin, suya, { section })).toBe(false)
  })

  it.each(['ficha', 'configuracion', 'vistaPrevia'] as const)('entra a «%s»', (section) => {
    expect(canAccessEvent(admin, suya, { section })).toBe(true)
  })

  it('el equipo del cliente entra a configuración y vista previa, no a la ficha', () => {
    expect(canAccessEvent(clienteActor, suya, { section: 'configuracion', memberships: ['cliente'] })).toBe(true)
    expect(canAccessEvent(clienteActor, suya, { section: 'vistaPrevia', memberships: ['coanfitrion'] })).toBe(true)
    expect(canAccessEvent(clienteActor, suya, { section: 'ficha', memberships: ['cliente'] })).toBe(false)
  })

  it('el atelier dueño sigue entrando a todo', () => {
    for (const section of ['full', 'cliente', 'ficha', 'configuracion'] as const) {
      expect(canAccessEvent(atelier, { userId: 'u1' }, { section })).toBe(true)
    }
  })

  it('la carcasa del admin pide la ficha', () => {
    expect(sectionForRole('admin')).toBe('ficha')
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
  const puerta: Actor = { userId: 'p1', email: 'puerta@ejemplo.bo', role: 'puerta', mustChangePassword: false }
  const evento = { userId: 'u1' }

  it('abre el check-in del evento donde es personal', () => {
    expect(canAccessEvent(puerta, evento, { section: 'checkin', memberships: ['puerta'] })).toBe(true)
  })

  it('no abre nada más de ese mismo evento', () => {
    // Ser personal de una boda no abre la lista de invitados de esa boda.
    expect(canAccessEvent(puerta, evento, { section: 'full', memberships: ['puerta'] })).toBe(false)
  })

  it('ni el check-in de un evento donde no lo es', () => {
    expect(canAccessEvent(puerta, evento, { section: 'checkin', memberships: [] })).toBe(false)
  })

  it('sin decir la sección, hereda «full» y queda fuera', () => {
    // El olvido cae del lado seguro: una página nueva que no diga su sección deniega.
    expect(canAccessEvent(puerta, evento, { memberships: ['puerta'] })).toBe(false)
    expect(canAccessEvent(puerta, evento)).toBe(false)
  })

  it('el dueño no se ve afectado por la sección; el admin sí', () => {
    expect(canAccessEvent(atelier, { userId: 'u1' }, { section: 'checkin' })).toBe(true)
    expect(canAccessEvent(admin, { userId: 'u1' }, { section: 'full' })).toBe(false)
  })
})

describe('canAccessEvent · el cliente', () => {
  const cliente: Actor = { userId: 'c1', email: 'novios@ejemplo.bo', role: 'cliente', mustChangePassword: false }
  const evento = { userId: 'u1' }

  it('entra en la sección del cliente del evento donde está dado de alta', () => {
    expect(canAccessEvent(cliente, evento, { section: 'cliente', memberships: ['cliente'] })).toBe(true)
  })

  it('no entra en el evento donde no lo está', () => {
    // La pertenencia es por boda: ser cliente de una no abre la de otro.
    expect(canAccessEvent(cliente, evento, { section: 'cliente', memberships: [] })).toBe(false)
  })

  it('no abre la sección completa, ni siendo de ese evento', () => {
    // `full` es Configuración, el plan y el borrado del evento: eso es del atelier que
    // vendió la boda, no de quien la celebra.
    expect(canAccessEvent(cliente, evento, { section: 'full', memberships: ['cliente'] })).toBe(false)
  })

  // Pedido por el usuario (16 sep): quien celebra ve quién llegó y puede abrir la puerta.
  it('ve las llegadas de su evento', () => {
    expect(canAccessEvent(cliente, evento, { section: 'checkin', memberships: ['cliente'] })).toBe(true)
  })

  it('sin decir la sección, hereda «full» y queda fuera', () => {
    // Una página nueva que no declare su sección deniega al cliente. El olvido cae del
    // lado seguro, igual que con el personal de puerta.
    expect(canAccessEvent(cliente, evento, { memberships: ['cliente'] })).toBe(false)
    expect(canAccessEvent(cliente, evento)).toBe(false)
  })

  it('el dueño del evento entra igual en la sección del cliente', () => {
    // El atelier ve todo lo que ve su cliente; al revés no.
    expect(canAccessEvent(atelier, { userId: 'u1' }, { section: 'cliente' })).toBe(true)
    // El admin no: los datos del cliente los ve entrando como el cliente.
    expect(canAccessEvent(admin, { userId: 'u1' }, { section: 'cliente' })).toBe(false)
  })

  it('y otro cliente no entra por tener el rol', () => {
    const ajeno: Actor = { userId: 'c2', email: 'otros@ejemplo.bo', role: 'cliente', mustChangePassword: false }

    expect(canAccessEvent(ajeno, evento, { section: 'cliente', memberships: [] })).toBe(false)
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
    expect(sectionForRole('admin')).toBe('ficha')
  })
})

describe('canManageStaff', () => {
  it('solo el admin da de alta a alguien en un evento', () => {
    expect(canManageStaff(admin)).toBe(true)
  })

  it('ni siquiera el dueño del evento', () => {
    // Esta prueba decía lo contrario. Se le dio la vuelta a propósito: dar de alta **crea
    // una cuenta** y le manda credenciales por correo, y eso es administrar el acceso al
    // sistema, no administrar una boda.
    expect(canManageStaff(atelier)).toBe(false)
  })

  it('otro atelier tampoco', () => {
    expect(canManageStaff(otro)).toBe(false)
  })

  it('y el propio personal de puerta no se añade compañeros', () => {
    const puerta: Actor = { userId: 'p1', email: 'p@ejemplo.bo', role: 'puerta', mustChangePassword: false }

    expect(canManageStaff(puerta)).toBe(false)
  })
})

describe('el equipo del evento: anfitrión, co-anfitrión y planner', () => {
  const persona: Actor = { userId: 'u9', email: 'p@ejemplo.bo', role: 'cliente', mustChangePassword: false }
  const evento = { userId: 'u1' }
  const puede = (memberships: Membership[], section: EventSection) => canAccessEvent(persona, evento, { section, memberships })

  it('los tres entran a la planificación y los invitados', () => {
    for (const m of ['cliente', 'coanfitrion', 'planner'] as const) expect(puede([m], 'cliente')).toBe(true)
  })

  it('los porteros los suman el anfitrión y el planner; el co-anfitrión no', () => {
    expect(puede(['cliente'], 'porteros')).toBe(true)
    expect(puede(['planner'], 'porteros')).toBe(true)
    expect(puede(['coanfitrion'], 'porteros')).toBe(false)
  })

  it('proveedores, cronograma y Día D son del anfitrión y su planner', () => {
    expect(puede(['cliente'], 'planner')).toBe(true)
    expect(puede(['planner'], 'planner')).toBe(true)
    expect(puede(['coanfitrion'], 'planner')).toBe(false)
  })

  it('al equipo solo suma gente el anfitrión: nadie da más permisos de los que tiene', () => {
    expect(puede(['cliente'], 'equipo')).toBe(true)
    expect(puede(['planner'], 'equipo')).toBe(false)
    expect(puede(['coanfitrion'], 'equipo')).toBe(false)
  })

  it('ninguno entra a lo del atelier; las llegadas, el anfitrión y su planner', () => {
    for (const m of ['cliente', 'coanfitrion', 'planner'] as const) expect(puede([m], 'full')).toBe(false)
    expect(puede(['cliente'], 'checkin')).toBe(true)
    expect(puede(['planner'], 'checkin')).toBe(true)
    expect(puede(['coanfitrion'], 'checkin')).toBe(false)
  })

  // Una planner puede tener cuenta de atelier propia: en el evento de otro entra por su
  // pertenencia, no por su rol.
  it('un atelier que es planner en el evento de otro entra como planner, no como dueño', () => {
    expect(canAccessEvent(otro, evento, { section: 'cliente', memberships: ['planner'] })).toBe(true)
    expect(canAccessEvent(otro, evento, { section: 'full', memberships: ['planner'] })).toBe(false)
  })

  it('el dueño entra también al equipo y a los porteros; el admin no', () => {
    expect(canAccessEvent(atelier, evento, { section: 'equipo' })).toBe(true)
    expect(canAccessEvent(admin, evento, { section: 'porteros' })).toBe(false)
  })

  it('la puerta sigue siendo solo la puerta, aunque la pertenencia diga otra cosa', () => {
    const puerta: Actor = { userId: 'u8', email: 'x@ejemplo.bo', role: 'puerta', mustChangePassword: false }
    expect(canAccessEvent(puerta, evento, { section: 'cliente', memberships: ['planner'] })).toBe(false)
  })

  it('el rol en el equipo sale de la pertenencia', () => {
    expect(rolEnEquipo(['cliente'])).toBe('anfitrion')
    expect(rolEnEquipo(['planner'])).toBe('planner')
    expect(rolEnEquipo([])).toBeNull()
  })
})


describe('gestionaElEvento', () => {
  it('el admin y el atelier dueño gestionan; otro atelier, un cliente y la puerta no', () => {
    const cliente: Actor = { userId: 'u1', email: 'c@ejemplo.bo', role: 'cliente', mustChangePassword: false }
    const puerta: Actor = { userId: 'u1', email: 'p@ejemplo.bo', role: 'puerta', mustChangePassword: false }
    const suyo = { userId: 'u1' }
    expect(gestionaElEvento(admin, suyo)).toBe(true)
    expect(gestionaElEvento(atelier, suyo)).toBe(true)
    expect(gestionaElEvento(otro, suyo)).toBe(false)
    // Mismo identificador que el dueño, pero sin el rol de atelier: no gestiona.
    expect(gestionaElEvento(cliente, suyo)).toBe(false)
    expect(gestionaElEvento(puerta, suyo)).toBe(false)
  })

  it('un evento sin dueño solo lo gestiona el admin', () => {
    expect(gestionaElEvento(admin, { userId: null })).toBe(true)
    expect(gestionaElEvento(atelier, { userId: null })).toBe(false)
  })
})
