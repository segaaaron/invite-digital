import { describe, expect, it } from 'vitest'
import { checkReleaseReadiness, PLACEHOLDERS } from './preflight'

const REAL = {
  whatsapp: '+59178945612',
  email: 'hola@atelierdeejemplo.bo',
  siteUrl: 'https://atelierdeejemplo.bo',
  siteDomain: 'atelierdeejemplo.bo',
  postgresPassword: 'CDwYGpyOXaB6mgTd1TVKbg',
  trustBrands: [] as readonly string[],
  payment: { bank: 'Banco de ejemplo', accountHolder: 'Atelier de ejemplo SRL', accountNumber: '1234567890' },
}

describe('comprobación previa al despliegue', () => {
  it('detiene el despliegue si la banda de confianza sigue con marcadores', () => {
    // Publicar «Marca aliada 1» como aval es enseñar un respaldo que no existe; y poner
    // ahí una marca real sin permiso es peor. Con la lista vacía la banda no se pinta.
    const blockers = checkReleaseReadiness({ ...REAL, trustBrands: ['Marca aliada 1', 'Marca aliada 2'] })
    expect(blockers).toHaveLength(1)
    expect(blockers[0]).toContain('banda de confianza')
  })

  it('una lista de marcas vacía es válida: la banda simplemente no se pinta', () => {
    expect(checkReleaseReadiness({ ...REAL, trustBrands: [] })).toEqual([])
  })

  it('deja pasar una configuración con datos reales', () => {
    expect(checkReleaseReadiness(REAL)).toEqual([])
  })

  it('detiene el despliegue con el WhatsApp de marcador', () => {
    const blockers = checkReleaseReadiness({ ...REAL, whatsapp: PLACEHOLDERS.whatsapp })
    expect(blockers).toHaveLength(1)
    expect(blockers[0]).toContain('WhatsApp')
  })

  it('detiene el despliegue con el correo de marcador', () => {
    expect(checkReleaseReadiness({ ...REAL, email: PLACEHOLDERS.email })).toHaveLength(1)
  })

  it('detiene el despliegue con el dominio de marcador, esté donde esté', () => {
    const blockers = checkReleaseReadiness({
      ...REAL,
      siteUrl: `https://${PLACEHOLDERS.domain}`,
      siteDomain: PLACEHOLDERS.domain,
    })
    expect(blockers).toHaveLength(2)
  })

  // Sin HTTPS la cookie de sesión lleva `secure` y el navegador no la guarda: el panel
  // quedaría inaccesible. Y todo enlace de invitado saldría en claro.
  it('exige HTTPS en el sitio publicado', () => {
    const blockers = checkReleaseReadiness({ ...REAL, siteUrl: 'http://atelierdeejemplo.bo' })
    expect(blockers).toHaveLength(1)
    expect(blockers[0]).toContain('HTTPS')
  })

  it('rechaza localhost como sitio publicado', () => {
    expect(checkReleaseReadiness({ ...REAL, siteUrl: 'http://localhost:3000' })).not.toHaveLength(0)
  })

  it('rechaza una contraseña de base de datos débil o de ejemplo', () => {
    expect(checkReleaseReadiness({ ...REAL, postgresPassword: 'invite' })).toHaveLength(1)
    expect(checkReleaseReadiness({ ...REAL, postgresPassword: 'prueba-local-no-produccion' })).toHaveLength(1)
  })

  it('acumula todos los bloqueos en vez de rendirse en el primero', () => {
    const blockers = checkReleaseReadiness({
      whatsapp: PLACEHOLDERS.whatsapp,
      email: PLACEHOLDERS.email,
      siteUrl: 'http://localhost:3000',
      siteDomain: PLACEHOLDERS.domain,
      postgresPassword: 'invite',
      trustBrands: ['Marca aliada 1'],
      payment: { bank: 'BANCO PENDIENTE', accountHolder: 'TITULAR PENDIENTE', accountNumber: 'CUENTA PENDIENTE' },
    })
    expect(blockers.length).toBeGreaterThanOrEqual(6)
  })
})

describe('los datos de transferencia del Plan B', () => {
  it('detienen el despliegue mientras sigan siendo marcadores', () => {
    const blockers = checkReleaseReadiness({
      ...REAL,
      payment: { bank: 'BANCO PENDIENTE', accountHolder: 'TITULAR PENDIENTE', accountNumber: 'CUENTA PENDIENTE' },
    })

    expect(blockers).toHaveLength(1)
    expect(blockers[0]).toContain('transferencia')
  })

  it('y también si alguien los vacía en vez de rellenarlos', () => {
    // Vaciar el marcador quita el aviso feo de la pantalla y deja el mismo agujero.
    const blockers = checkReleaseReadiness({
      ...REAL,
      payment: { bank: '', accountHolder: '', accountNumber: '' },
    })

    expect(blockers).toHaveLength(1)
  })

  it('con datos de verdad no dicen nada', () => {
    expect(checkReleaseReadiness(REAL)).toEqual([])
  })
})
