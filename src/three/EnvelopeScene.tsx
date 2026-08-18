'use client'

import { ContactShadows, PresentationControls, useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { DoubleSide, Shape, type Group } from 'three'

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
const SEAL_GOLD_LIGHT = '#e2c584'
const AMBIENT_WARM = '#fff6e8'

const WIDTH = 3
const HEIGHT = 2
const FLAP_DROP = 1.12
const OPEN_ANGLE = -Math.PI * 0.95

/** Triangular flap, extruded thin, with its pivot on the envelope's top edge. */
function useFlapShape(): Shape {
  return useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-WIDTH / 2, 0)
    shape.lineTo(WIDTH / 2, 0)
    shape.lineTo(0, -FLAP_DROP)
    shape.closePath()
    return shape
  }, [])
}

function Envelope() {
  const flap = useRef<Group>(null)
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const invalidate = useThree((state) => state.invalidate)
  const flapShape = useFlapShape()

  // frameloop="demand" only paints when something asks for it, so the easing
  // keeps requesting frames until it settles and then lets the loop go quiet.
  useCursor(hovered)

  useFrame((_, delta) => {
    const group = flap.current
    if (!group) return
    const target = open ? OPEN_ANGLE : 0
    const distance = target - group.rotation.x
    if (Math.abs(distance) < 0.001) {
      group.rotation.x = target
      return
    }
    group.rotation.x += distance * Math.min(delta * 3, 1)
    invalidate()
  })

  return (
    <group
      // A click ray hits the paper and the flap alike; without stopPropagation
      // R3F fires the handler once per intersection and the toggle cancels itself.
      onClick={(event) => {
        event.stopPropagation()
        setOpen((value) => !value)
        invalidate()
      }}
      onPointerOut={() => setHovered(false)}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      rotation={[-0.16, 0.22, 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[WIDTH, HEIGHT, 0.07]} />
        <meshPhysicalMaterial
          clearcoat={0.12}
          color={PAPER_COLOR}
          roughness={0.78}
          sheen={0.5}
          sheenColor={PAPER_SHEEN_COLOR}
        />
      </mesh>

      <group position={[0, HEIGHT / 2, 0.04]} ref={flap}>
        <mesh castShadow receiveShadow>
          <extrudeGeometry args={[flapShape, { depth: 0.02, bevelEnabled: false }]} />
          <meshPhysicalMaterial clearcoat={0.1} color={FLAP_COLOR} roughness={0.72} side={DoubleSide} />
        </mesh>
      </group>

      {/* Without an environment map a high metalness reads as muddy brown, so
          the seal leans on clearcoat and a warm rim light instead. */}
      <mesh castShadow position={[0, HEIGHT / 2 - FLAP_DROP, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.23, 0.25, 0.08, 64]} />
        <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.12}
          color={SEAL_GOLD_COLOR}
          metalness={0.25}
          roughness={0.34}
          sheen={0.6}
          sheenColor={SEAL_GOLD_LIGHT}
        />
      </mesh>
    </group>
  )
}

export default function EnvelopeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.25, 5.1], fov: 36 }}
      dpr={[1, 1.75]}
      frameloop="demand"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      shadows
    >
      <ambientLight color={AMBIENT_WARM} intensity={1.05} />
      <directionalLight castShadow intensity={1.1} position={[2.6, 3.4, 3.2]} />
      {/* Warm rim light that keeps the gold seal from reading as flat paint. */}
      <pointLight color={SEAL_GOLD_LIGHT} intensity={9} position={[-2.2, 1.4, 2.6]} />
      <PresentationControls azimuth={[-0.45, 0.45]} polar={[-0.18, 0.28]} snap>
        <Envelope />
      </PresentationControls>
      <ContactShadows blur={3} far={2.4} opacity={0.22} position={[0, -1.24, 0]} scale={6} />
    </Canvas>
  )
}
