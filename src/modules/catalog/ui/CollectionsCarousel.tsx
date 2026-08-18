'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Template } from '../domain/template'
import { TemplateCard } from './TemplateCard'

type Props = { templates: readonly Template[]; dictionary: Dictionary }

export function CollectionsCarousel({ templates, dictionary }: Props) {
  const [index, setIndex] = useState(0)
  const last = Math.max(templates.length - 1, 0)
  const active = templates[index]
  const reduceMotion = useReducedMotion()

  const go = (delta: number) => setIndex((current) => Math.min(Math.max(current + delta, 0), last))

  return (
    <div className="relative">
      <motion.ul
        animate={{ x: `calc(${-index} * (280px + 24px))` }}
        className="flex gap-6"
        drag="x"
        dragConstraints={{ left: -last * 304, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => go(info.offset.x < -60 ? 1 : info.offset.x > 60 ? -1 : 0)}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 20 }}
      >
        {templates.map((template, i) => (
          <li aria-current={i === index ? 'true' : undefined} className="shrink-0" key={template.slug} role="group">
            <TemplateCard dictionary={dictionary} template={template} />
          </li>
        ))}
      </motion.ul>

      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-5 py-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] disabled:opacity-40"
          disabled={index === 0}
          onClick={() => go(-1)}
          type="button"
        >
          {dictionary.collections.previous}
        </button>
        <span aria-live="polite" className="text-[11px] text-ink-mute">
          {active ? active.name : dictionary.collections.hint}
        </span>
        <button
          className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-5 py-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] disabled:opacity-40"
          disabled={index === last}
          onClick={() => go(1)}
          type="button"
        >
          {dictionary.collections.next}
        </button>
      </div>
    </div>
  )
}
