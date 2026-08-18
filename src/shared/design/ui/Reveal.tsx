'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUp, viewportOnce } from '@/shared/design/motion/variants'

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}
