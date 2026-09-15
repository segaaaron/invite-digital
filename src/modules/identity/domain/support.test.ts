import { describe, expect, it } from 'vitest'
import type { Actor } from './access'
import { actorDeSesion, leerMotivo } from './support'

const admin: Actor = { userId: 'a1', email: 'admin@ejemplo.bo', role: 'admin', mustChangePassword: false }
const cliente: Actor = { userId: 'c1', email: 'novios@ejemplo.bo', role: 'cliente', mustChangePassword: true }
const soporte = { id: 's1', adminEmail: 'admin@ejemplo.bo', cliente }

describe('actorDeSesion', () => {
  it('sin modo soporte, la sesión es de quien la abrió', () => {
    expect(actorDeSesion(admin, null)).toEqual({ actor: admin, limpiar: false })
  })

  it('en modo soporte, el admin actúa como el cliente, marcado, y sin que le pida cambiar su contraseña', () => {
    expect(actorDeSesion(admin, soporte)).toEqual({
      actor: { ...cliente, mustChangePassword: false, soporte: { id: 's1', adminUserId: 'a1', adminEmail: 'admin@ejemplo.bo' } },
      limpiar: false,
    })
  })

  it('nunca sube privilegios: si quien tiene la sesión ya no es admin, se ignora y se limpia', () => {
    const exAdmin: Actor = { ...admin, role: 'atelier' }
    expect(actorDeSesion(exAdmin, soporte)).toEqual({ actor: exAdmin, limpiar: true })
  })

  it('si el cliente ya no existe, vuelve el admin y se limpia', () => {
    expect(actorDeSesion(admin, { ...soporte, cliente: null })).toEqual({ actor: admin, limpiar: true })
  })

  it('un cliente que llegara con la marca no la conserva: el soporte lo pone solo esta función', () => {
    expect(actorDeSesion({ ...cliente, soporte: { id: 'x', adminUserId: 'a1', adminEmail: 'x' } }, null).actor.soporte).toBeUndefined()
  })
})

describe('leerMotivo', () => {
  it('exige entre 10 y 500 caracteres, recortados', () => {
    expect(leerMotivo('  corto  ')).toEqual({ ok: false, mensaje: 'Escribe el motivo: al menos 10 caracteres.' })
    expect(leerMotivo('  No carga la lista  ')).toEqual({ ok: true, motivo: 'No carga la lista' })
    expect(leerMotivo('x'.repeat(501)).ok).toBe(false)
  })
})
