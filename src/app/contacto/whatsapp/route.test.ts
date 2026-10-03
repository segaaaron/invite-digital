import { beforeEach, describe, expect, it, vi } from 'vitest'

const ajustes = { whatsapp: '', mensajes: { general: { es: 'Hola' } } }
vi.mock('@/app/composition/container', () => ({ site: { settings: async () => ajustes } }))
vi.mock('@/shared/config/env', () => ({ env: { SITE_URL: 'https://luxuryatelier.net' } }))

const { GET } = await import('./route')

describe('/contacto/whatsapp', () => {
  beforeEach(() => {
    ajustes.whatsapp = ''
  })

  it('sin número, lleva a la portada pública y no a la dirección interna del contenedor', async () => {
    const respuesta = await GET()
    expect(respuesta.status).toBe(302)
    expect(respuesta.headers.get('location')).toBe('https://luxuryatelier.net/')
  })

  it('con número, lleva a WhatsApp', async () => {
    ajustes.whatsapp = '59170000000'
    const respuesta = await GET()
    expect(respuesta.headers.get('location')).toMatch(/^https:\/\/wa\.me\/59170000000/)
  })
})
