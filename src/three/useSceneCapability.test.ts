import { describe, expect, it } from 'vitest'
import { canRenderScene } from './useSceneCapability'

describe('canRenderScene', () => {
  it('permite la escena en un equipo capaz', () => {
    expect(canRenderScene({ reducedMotion: false, deviceMemory: 8, hasWebGL2: true })).toBe(true)
  })

  it('bloquea cuando el usuario pide movimiento reducido', () => {
    expect(canRenderScene({ reducedMotion: true, deviceMemory: 8, hasWebGL2: true })).toBe(false)
  })

  it('bloquea equipos con menos de 4 GB reportados', () => {
    expect(canRenderScene({ reducedMotion: false, deviceMemory: 2, hasWebGL2: true })).toBe(false)
  })

  it('bloquea sin WebGL2', () => {
    expect(canRenderScene({ reducedMotion: false, deviceMemory: 8, hasWebGL2: false })).toBe(false)
  })

  it('permite cuando el navegador no reporta memoria', () => {
    expect(canRenderScene({ reducedMotion: false, hasWebGL2: true })).toBe(true)
  })
})
