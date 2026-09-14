'use client'

import { useState } from 'react'
import { HELP_CONTACT } from './topics'

const CAMPO =
  'w-full rounded-[14px] border border-line-panel-strong bg-white px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-ink'
const ROTULO = 'font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase'

/** El texto que se lleva el atelier, ya montado. */
export function supportMessage(input: { name: string; email: string; message: string }): string {
  const nombre = input.name.trim()
  const correo = input.email.trim()
  const cuerpo = input.message.trim()
  return `Soporte Luxury Atelier\nDe: ${nombre || 'sin nombre'}${correo === '' ? '' : ` · ${correo}`}\n\n${cuerpo}`
}

/**
 * El formulario de soporte de la maqueta: nombre, correo y mensaje.
 *
 * **Abre WhatsApp con el mensaje ya escrito; no lo manda por su cuenta.** No hay servidor
 * de correo en este proyecto, y un botón que dijera «Enviado» sin haber enviado nada es
 * exactamente la clase de mentira que deja a alguien esperando una respuesta que no va a
 * llegar. El correo queda como alternativa, con el mismo texto.
 */
export function SupportForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const vacio = message.trim() === ''
  const texto = supportMessage({ name, email, message })
  const whatsapp = `${HELP_CONTACT.whatsappHref}?text=${encodeURIComponent(texto)}`
  const correo = `${HELP_CONTACT.emailHref}?subject=${encodeURIComponent('Soporte Luxury Atelier')}&body=${encodeURIComponent(texto)}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={ROTULO} htmlFor="soporte-nombre">
          Nombre
        </label>
        <input className={CAMPO} id="soporte-nombre" onChange={(e) => setName(e.target.value)} type="text" value={name} />
      </div>

      <div className="flex flex-col gap-2">
        <label className={ROTULO} htmlFor="soporte-email">
          Email
        </label>
        <input className={CAMPO} id="soporte-email" onChange={(e) => setEmail(e.target.value)} type="email" value={email} />
      </div>

      <div className="flex flex-col gap-2">
        <label className={ROTULO} htmlFor="soporte-mensaje">
          Mensaje
        </label>
        <textarea
          className={CAMPO}
          id="soporte-mensaje"
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          value={message}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          aria-disabled={vacio}
          className={`w-fit rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px ${
            vacio ? 'pointer-events-none opacity-40' : ''
          }`}
          href={whatsapp}
          rel="noopener noreferrer"
          target="_blank"
        >
          Enviar por WhatsApp
        </a>
        <a className="text-[13px] text-gold-deep underline-offset-4 hover:underline" href={correo}>
          o por correo
        </a>
      </div>

      <p className="text-[11px] leading-[1.6] text-ink-mute">
        Se abre WhatsApp con el mensaje escrito para que lo envíes tú. Nada se manda solo.
      </p>
    </div>
  )
}
