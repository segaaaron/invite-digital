'use client'

import { useEffect } from 'react'

/** Los atajos que abren el código o las herramientas del navegador, o guardan la página. */
function esAtajoDeCodigo(e: KeyboardEvent): boolean {
  const tecla = e.key.toLowerCase()
  const mod = e.ctrlKey || e.metaKey
  if (e.key === 'F12') return true
  // Ctrl/Cmd + U (ver código), S (guardar), P (imprimir).
  if (mod && !e.shiftKey && !e.altKey && (tecla === 'u' || tecla === 's' || tecla === 'p')) return true
  // Ctrl+Shift+I/J/C (Windows/Linux) y Cmd+Option+I/J/C/U (Mac): herramientas y consola.
  if (mod && (e.shiftKey || e.altKey) && ['i', 'j', 'c', 'u'].includes(tecla)) return true
  // Con Option, macOS cambia la tecla («ˆ» por la i): se mira también el código físico.
  if (mod && e.altKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyU'].includes(e.code)) return true
  return false
}

/** Dentro de un campo se deja el menú: el invitado pega su mensaje. */
const enCampo = (destino: EventTarget | null) =>
  destino instanceof HTMLElement && destino.closest('input, textarea, select, [contenteditable="true"]') !== null

/**
 * Que no se vea el código ni se copie el arte de una invitación (pedido del usuario): sin menú
 * del botón derecho, sin los atajos de «ver código» y de las herramientas, y sin arrastrar ni
 * guardar las imágenes (la clase `theme-protegida` del `<body>` apaga el arrastre y la pulsación
 * larga de iOS).
 *
 * **Es un disuasivo, no una protección**: quien sepa (`view-source:`, desactivar JavaScript, un
 * `curl`) sigue viendo el HTML, que el navegador necesita para pintar. No pinta nada.
 */
export function SinVerCodigo() {
  useEffect(() => {
    const menu = (e: MouseEvent) => {
      if (!enCampo(e.target)) e.preventDefault()
    }
    const teclado = (e: KeyboardEvent) => {
      // Copiar y pegar (Ctrl+C/V sin Shift) no están en la lista: los campos siguen igual.
      if (esAtajoDeCodigo(e)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const arrastre = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement) e.preventDefault()
    }
    document.addEventListener('contextmenu', menu)
    document.addEventListener('keydown', teclado, true)
    document.addEventListener('dragstart', arrastre)
    return () => {
      document.removeEventListener('contextmenu', menu)
      document.removeEventListener('keydown', teclado, true)
      document.removeEventListener('dragstart', arrastre)
    }
  }, [])
  return null
}
