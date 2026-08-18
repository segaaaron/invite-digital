'use client'

import { useEffect, useState } from 'react'

export type SceneCapabilityInput = {
  reducedMotion: boolean
  deviceMemory?: number
  hasWebGL2: boolean
}

const MIN_DEVICE_MEMORY_GB = 4

export function canRenderScene({ reducedMotion, deviceMemory, hasWebGL2 }: SceneCapabilityInput): boolean {
  if (reducedMotion) return false
  if (!hasWebGL2) return false
  if (typeof deviceMemory === 'number' && deviceMemory < MIN_DEVICE_MEMORY_GB) return false
  return true
}

function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null
  } catch {
    return false
  }
}

export function useSceneCapability(): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    setEnabled(
      canRenderScene(
        deviceMemory === undefined
          ? { reducedMotion, hasWebGL2: detectWebGL2() }
          : { reducedMotion, deviceMemory, hasWebGL2: detectWebGL2() },
      ),
    )
  }, [])

  return enabled
}
