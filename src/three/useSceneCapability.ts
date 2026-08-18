'use client'

import { useSyncExternalStore } from 'react'

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

function reducedMotionQuery(): MediaQueryList {
  return window.matchMedia('(prefers-reduced-motion: reduce)')
}

function computeCapability(): boolean {
  const reducedMotion = reducedMotionQuery().matches
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const hasWebGL2 = detectWebGL2()

  return canRenderScene(
    deviceMemory === undefined ? { reducedMotion, hasWebGL2 } : { reducedMotion, deviceMemory, hasWebGL2 },
  )
}

// useSyncExternalStore demands a snapshot that is stable across renders, and
// creating a probe canvas on every render would be wasteful, so the answer is
// computed once and invalidated only when the motion preference changes.
let snapshot: boolean | null = null

function subscribe(onStoreChange: () => void): () => void {
  const query = reducedMotionQuery()
  const handleChange = (): void => {
    snapshot = null
    onStoreChange()
  }
  query.addEventListener('change', handleChange)
  return () => query.removeEventListener('change', handleChange)
}

function getSnapshot(): boolean {
  if (snapshot === null) snapshot = computeCapability()
  return snapshot
}

// The server and the hydration pass always answer "no": the poster is the LCP
// candidate and must never wait on a WebGL probe that only the client can run.
function getServerSnapshot(): boolean {
  return false
}

export function useSceneCapability(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
