'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { EyeIcon, EyeOffIcon } from '../icons'
import { FIELD_CLASS } from './PanelKit'

/**
 * Todo campo de contraseña del sitio: **oculta por defecto** —se escribe delante de otros, a
 * veces compartiendo pantalla— y con el ojo dentro para comprobar lo escrito antes de enviarla.
 *
 * - El ojo va **dentro** del campo: fuera empuja el ancho y en el teléfono deja la contraseña
 *   en un cajón más estrecho que el correo.
 * - `type="button"`: dentro de un formulario, un botón sin tipo envía.
 * - Su nombre es «Mostrar»/«Ocultar», **sin la palabra «Contraseña»**: con ella, un
 *   `getByLabel('Contraseña')` casaba con el campo y con el botón, y el setup de las e2e murió.
 */
export function CampoContrasena({
  className = FIELD_CLASS,
  envoltura = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { className?: string; envoltura?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={`relative ${envoltura}`.trim()}>
      <input {...rest} className={`${className} pr-12`} type={visible ? 'text' : 'password'} />
      <button
        aria-label={visible ? 'Ocultar' : 'Mostrar'}
        aria-pressed={visible}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-[10px] p-2 text-ink-mute transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        onClick={() => setVisible((antes) => !antes)}
        type="button"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}
