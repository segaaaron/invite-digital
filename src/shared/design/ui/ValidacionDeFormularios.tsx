'use client'

import { useEffect } from 'react'
import { mensajeDeValidacion } from './validacion'

type Campo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

const esCampo = (nodo: EventTarget | null): nodo is Campo =>
  nodo instanceof HTMLInputElement || nodo instanceof HTMLSelectElement || nodo instanceof HTMLTextAreaElement

const MENSAJE = 'data-mensaje-validacion'

/**
 * Las validaciones de **todos** los formularios, en una pieza: en vez de la burbuja del navegador
 * —en el idioma del sistema y con su piel—, un mensaje propio bajo el campo, en el idioma de la
 * página, con el campo marcado (`aria-invalid`, que pinta `globals.css`) y el primero enfocado.
 *
 * Las reglas no cambian: son las del propio campo (`required`, `type`, `minLength`…), así que no
 * hay que tocar ningún formulario y uno nuevo queda cubierto solo. El mensaje se va al corregirlo.
 * Se monta una vez en cada raíz de layout.
 */
export function ValidacionDeFormularios() {
  useEffect(() => {
    const idioma = () => document.documentElement.lang || 'es'

    // Dónde va el mensaje: tras la etiqueta que envuelve al campo, o tras la fila si el campo
    // comparte fila con otra cosa (un botón, un icono); si no, tras el propio campo.
    const anclaDe = (campo: Campo): Element => {
      // Un grupo de radios antes que su etiqueta: cada opción va en la suya (las estrellas de la
      // encuesta) y el mensaje es del grupo entero.
      const grupo = campo.type === 'radio' ? campo.closest('fieldset, [role="radiogroup"]') : null
      if (grupo !== null) return grupo
      const etiqueta = campo.closest('label')
      if (etiqueta !== null) return etiqueta
      const padre = campo.parentElement
      if (padre !== null && padre.children.length > 1) {
        const estilo = getComputedStyle(padre)
        if (estilo.display.includes('flex') && !estilo.flexDirection.startsWith('column')) return padre
        if (estilo.position === 'relative') return padre
      }
      return campo
    }

    const clave = (campo: Campo) => (campo.type === 'radio' && campo.name !== '' ? `radio:${campo.name}` : '')

    const limpiar = (campo: Campo) => {
      campo.removeAttribute('aria-invalid')
      const id = campo.getAttribute('data-validacion-id')
      if (id !== null) document.getElementById(id)?.remove()
      campo.removeAttribute('data-validacion-id')
      const descrito = (campo.getAttribute('aria-describedby') ?? '').split(' ').filter((x) => x !== '' && x !== id)
      if (descrito.length === 0) campo.removeAttribute('aria-describedby')
      else campo.setAttribute('aria-describedby', descrito.join(' '))
    }

    const marcar = (campo: Campo) => {
      const texto = mensajeDeValidacion(campo as HTMLInputElement, campo instanceof HTMLSelectElement ? 'select' : campo instanceof HTMLTextAreaElement ? 'textarea' : 'input', idioma())
      campo.setAttribute('aria-invalid', 'true')
      const ancla = anclaDe(campo)
      // El suyo, si ya lo tenía; en un grupo de radios, uno solo para todo el grupo.
      const grupo = clave(campo)
      const suyo = campo.getAttribute('data-validacion-id')
      let mensaje: HTMLElement | null =
        (suyo === null ? null : document.getElementById(suyo)) ??
        (grupo === '' ? null : (ancla.parentElement?.querySelector<HTMLElement>(`[${MENSAJE}="${CSS.escape(grupo)}"]`) ?? null))
      if (mensaje === null) {
        mensaje = document.createElement('p')
        mensaje.id = `validacion-${Math.random().toString(36).slice(2, 9)}`
        mensaje.setAttribute(MENSAJE, grupo)
        mensaje.setAttribute('role', 'alert')
        // Una pastilla marfil con filete del rojo de peligro: se lee igual sobre el panel claro que
        // sobre una invitación oscura, sin gritar.
        mensaje.className =
          'mt-1.5 flex w-fit max-w-full items-start gap-1.5 rounded-[10px] border border-danger/25 bg-bg-raised/95 px-2.5 py-1 text-left text-[12px] leading-snug font-medium text-danger shadow-[0_2px_10px_rgba(0,0,0,0.10)] backdrop-blur-[2px]'
        ancla.insertAdjacentElement('afterend', mensaje)
        // En una rejilla, el mensaje ocupa su propia fila bajo el campo, no la celda de al lado.
        if (ancla.parentElement !== null && getComputedStyle(ancla.parentElement).display.includes('grid')) mensaje.style.gridColumn = '1 / -1'
      }
      mensaje.innerHTML = '<svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13" style="flex-shrink:0;margin-top:1px"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.6v4.2M8 11.2v.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
      mensaje.append(document.createTextNode(texto))
      campo.setAttribute('data-validacion-id', mensaje.id)
      const descrito = new Set((campo.getAttribute('aria-describedby') ?? '').split(' ').filter((x) => x !== ''))
      descrito.add(mensaje.id)
      campo.setAttribute('aria-describedby', [...descrito].join(' '))
    }

    const alInvalido = (evento: Event) => {
      const campo = evento.target
      if (!esCampo(campo)) return
      // Sin burbuja del navegador: el mensaje es el nuestro.
      evento.preventDefault()
      marcar(campo)
      // El primero que falla, a la vista y enfocado; los demás, marcados.
      const primero = campo.form?.querySelector<Campo>(':invalid:not(fieldset):not(form)')
      if (primero === campo) {
        // Un campo invisible —el valor de los calendarios propios— se enfoca en lo que se ve: el
        // botón que abre el calendario.
        const visible = campo.getAttribute('aria-hidden') === 'true' ? anclaDe(campo).querySelector<HTMLElement>('button, [tabindex="0"]') : null
        const destino = visible ?? campo
        destino.focus({ preventScroll: true })
        destino.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }

    const alCambiar = (evento: Event) => {
      const campo = evento.target
      if (!esCampo(campo) || !campo.hasAttribute('data-validacion-id')) return
      if (campo.validity.valid) {
        // En un grupo de radios, al elegir uno se limpian todos.
        if (campo.type === 'radio' && campo.form !== null && campo.name !== '') {
          campo.form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(campo.name)}"]`).forEach(limpiar)
        } else limpiar(campo)
      } else marcar(campo)
    }

    // `invalid` no burbujea: se escucha en captura.
    document.addEventListener('invalid', alInvalido, true)
    document.addEventListener('input', alCambiar, true)
    document.addEventListener('change', alCambiar, true)
    return () => {
      document.removeEventListener('invalid', alInvalido, true)
      document.removeEventListener('input', alCambiar, true)
      document.removeEventListener('change', alCambiar, true)
    }
  }, [])

  return null
}
