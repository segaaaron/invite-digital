import type { ReactNode } from 'react'

/**
 * Un texto legal escrito por el admin, pintado sin HTML de por medio.
 *
 * El formato es mínimo a propósito: **una línea que empieza por `## ` es un título** y el
 * resto son párrafos separados por una línea en blanco. Nada se interpreta como HTML: lo que
 * escribe el admin se pinta como texto, así que no hay forma de colar un `<script>` desde el
 * panel.
 */
export function LegalText({ texto }: { texto: string }) {
  const bloques: ReactNode[] = []
  let parrafo: string[] = []
  const cerrar = () => {
    if (parrafo.length > 0) bloques.push(<p key={`p${bloques.length}`}>{parrafo.join(' ')}</p>)
    parrafo = []
  }
  for (const linea of texto.split('\n')) {
    const limpia = linea.trim()
    if (limpia.startsWith('## ')) {
      cerrar()
      bloques.push(
        <h2 className="mt-4 font-display text-[26px] font-light text-ink" key={`h${bloques.length}`}>
          {limpia.slice(3)}
        </h2>,
      )
    } else if (limpia === '') {
      cerrar()
    } else {
      parrafo.push(limpia)
    }
  }
  cerrar()
  return <div className="flex flex-col gap-4 text-[15px] leading-[1.8] text-ink-soft">{bloques}</div>
}
