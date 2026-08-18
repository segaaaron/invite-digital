'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Suspense, useState } from 'react'
import { SceneBoundary } from './SceneBoundary'
import { useSceneCapability } from './useSceneCapability'

// `ssr: false` keeps three, @react-three/fiber and drei out of the initial
// bundle: the chunk only loads on devices that passed the capability check.
const EnvelopeScene = dynamic(() => import('./EnvelopeScene'), { ssr: false })

// R3F reads the canvas size from its parent, so the wrapper needs a definite
// height instead of `h-full`, which would collapse inside an auto-height grid cell.
const SLOT_CLASS = 'h-[440px] w-full lg:h-[540px]'

type Props = { posterSrc: string; alt: string; openLabel: string; closeLabel: string }

export function HeroCanvas({ posterSrc, alt, openLabel, closeLabel }: Props) {
  const capable = useSceneCapability()
  const [contextLost, setContextLost] = useState(false)
  const [open, setOpen] = useState(false)

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

  // The poster is the LCP candidate, so it is what the server and the first paint
  // deliver; the scene only replaces it after the capability check, and it goes back
  // to the poster if the GPU context is lost.
  if (!capable || contextLost) return <div className={SLOT_CLASS}>{poster}</div>

  return (
    <div className={`relative ${SLOT_CLASS}`}>
      {/* The scene replaces an image, so it keeps the image's accessible name: the
          poster's own alt is unavailable once the canvas takes over. */}
      <div aria-label={alt} className="h-full w-full" role="img">
        <SceneBoundary fallback={poster}>
          <Suspense fallback={poster}>
            <EnvelopeScene onContextLost={() => setContextLost(true)} onToggle={() => setOpen((v) => !v)} open={open} />
          </Suspense>
        </SceneBoundary>
      </div>

      {/* The mesh only answers to pointers, so the interaction needs a real control to
          exist for keyboard and screen reader users. */}
      <button
        aria-pressed={open}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-bg-raised/80 px-5 py-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink backdrop-blur-md transition-colors hover:border-gold"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? closeLabel : openLabel}
      </button>
    </div>
  )
}
