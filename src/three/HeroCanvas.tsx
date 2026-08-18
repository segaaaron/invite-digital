'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Suspense } from 'react'
import { useSceneCapability } from './useSceneCapability'

// `ssr: false` keeps three, @react-three/fiber and drei out of the initial
// bundle: the chunk only loads on devices that passed the capability check.
const EnvelopeScene = dynamic(() => import('./EnvelopeScene'), { ssr: false })

// R3F reads the canvas size from its parent, so the wrapper needs a definite
// height instead of `h-full`, which would collapse inside an auto-height grid cell.
const SLOT_CLASS = 'h-[440px] w-full lg:h-[540px]'

type Props = { posterSrc: string; alt: string }

export function HeroCanvas({ posterSrc, alt }: Props) {
  const enabled = useSceneCapability()

  const poster = (
    <Image
      alt={alt}
      className="h-full w-full rounded-[var(--radius-card)] object-cover"
      height={1000}
      priority
      sizes="(max-width: 1024px) 90vw, 520px"
      src={posterSrc}
      width={1400}
    />
  )

  // The poster is the LCP candidate, so it is what the server and the first
  // paint deliver; the scene only replaces it after the capability check.
  if (!enabled) return <div className={SLOT_CLASS}>{poster}</div>

  // The scene replaces an image, so it keeps the image's accessible name; the
  // poster's own alt is unavailable once the canvas takes over.
  return (
    <div aria-label={alt} className={SLOT_CLASS} role="img">
      <Suspense fallback={poster}>
        <EnvelopeScene />
      </Suspense>
    </div>
  )
}
