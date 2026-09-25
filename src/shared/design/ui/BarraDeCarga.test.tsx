import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let ruta = '/panel/admin'
vi.mock('next/navigation', () => ({ usePathname: () => ruta, useSearchParams: () => new URLSearchParams() }))
const { BarraDeCarga } = await import('./BarraDeCarga')

const enlace = (href: string, extra: Record<string, string> = {}) => {
  const a = document.createElement('a')
  a.href = href
  for (const [k, v] of Object.entries(extra)) a.setAttribute(k, v)
  // Como `<Link>`: cancela el clic nativo para navegar sin recargar.
  a.addEventListener('click', (e) => e.preventDefault())
  document.body.appendChild(a)
  return a
}

beforeEach(() => {
  ruta = '/panel/admin'
  window.history.replaceState(null, '', '/panel/admin')
  document.body.innerHTML = ''
})

describe('BarraDeCarga', () => {
  it('aparece al pulsar un enlace interno y se va al llegar; volver atrás no la cuelga', () => {
    const { container, rerender } = render(<BarraDeCarga />)
    fireEvent.click(enlace('/panel/admin/ventas'))
    expect(container.querySelector('.barra-de-carga')).not.toBeNull()

    ruta = '/panel/admin/ventas'
    window.history.replaceState(null, '', ruta)
    rerender(<BarraDeCarga />)
    expect(container.querySelector('.barra-de-carga')).toBeNull()

    ruta = '/panel/admin'
    window.history.replaceState(null, '', ruta)
    act(() => rerender(<BarraDeCarga />))
    expect(container.querySelector('.barra-de-carga')).toBeNull()
  })

  it('no aparece para la misma página, otra pestaña, un sitio externo o con ⌘', () => {
    const { container } = render(<BarraDeCarga />)
    fireEvent.click(enlace('/panel/admin#algo'))
    fireEvent.click(enlace('/panel/admin/ventas', { target: '_blank' }))
    fireEvent.click(enlace('https://otro.bo/x'))
    fireEvent.click(enlace('/panel/admin/ventas'), { metaKey: true })
    expect(container.querySelector('.barra-de-carga')).toBeNull()
  })
})
