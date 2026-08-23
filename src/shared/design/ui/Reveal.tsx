'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUp, viewportOnce } from '@/shared/design/motion/variants'

export function Reveal({
  children,
  className = '',
  delay = 0,
  onMount = false,
}: {
  children: ReactNode
  className?: string
  delay?: number
  /**
   * Aparece **al cargar**, sin esperar a que la sección entre en pantalla.
   *
   * Es lo que necesita el hero: si el navegador restaura la posición del scroll o la
   * sección nunca llega al cuarto visible que pide el observador, el contenido se queda
   * invisible para siempre. Pasó — la portada se abrió con el sobre y sin una palabra.
   */
  onMount?: boolean
}) {
  // framer-motion writes inline styles, which the `prefers-reduced-motion` block in
  // globals.css cannot reach: the content has to be shown outright instead.
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div className={className} data-reveal={onMount ? 'mount' : 'scroll'}>
        {children}
      </div>
    )
  }

  if (onMount) {
    return (
      <motion.div
        animate="visible"
        className={className}
        data-reveal="mount"
        initial="hidden"
        transition={{ delay }}
        variants={fadeUp}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={className}
      data-reveal="scroll"
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
