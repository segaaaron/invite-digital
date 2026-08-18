'use client'

import { Environment, PresentationControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'

/**
 * Brand material colors for the 3D envelope scene. These are Three.js material
 * properties, not CSS — the "no literal hex outside tokens.css" rule exempts
 * scene materials, but the values still mirror the tokens: --color-bg-raised
 * (paper), --color-bg (flap), --color-gold (seal).
 */
const PAPER_COLOR = '#fdfaf4'
const PAPER_SHEEN_COLOR = '#e2c584'
const FLAP_COLOR = '#f6f1e9'
const SEAL_GOLD_COLOR = '#c19b4a'

function Envelope() {
  const flap = useRef<Group>(null)
  const [open, setOpen] = useState(false)

  useFrame((_, delta) => {
    if (!flap.current) return
    const target = open ? -Math.PI * 0.85 : 0
    flap.current.rotation.x += (target - flap.current.rotation.x) * Math.min(delta * 3, 1)
  })

  return (
    <group onClick={() => setOpen((v) => !v)}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3, 2, 0.06]} />
        <meshPhysicalMaterial color={PAPER_COLOR} roughness={0.75} sheen={0.4} sheenColor={PAPER_SHEEN_COLOR} />
      </mesh>

      <group position={[0, 1, 0.03]} ref={flap}>
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[3, 1, 0.04]} />
          <meshPhysicalMaterial color={FLAP_COLOR} roughness={0.7} />
        </mesh>
      </group>

      <mesh position={[0, 0.05, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.06, 48]} />
        <meshPhysicalMaterial clearcoat={1} color={SEAL_GOLD_COLOR} metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  )
}

export default function EnvelopeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 5.4], fov: 38 }}
      dpr={[1, 1.75]}
      frameloop="demand"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      shadows
    >
      <ambientLight intensity={0.7} />
      <directionalLight castShadow intensity={1.15} position={[3, 4, 3]} />
      <PresentationControls azimuth={[-0.4, 0.4]} polar={[-0.15, 0.25]} snap>
        <Envelope />
      </PresentationControls>
      <Environment preset="studio" />
    </Canvas>
  )
}
