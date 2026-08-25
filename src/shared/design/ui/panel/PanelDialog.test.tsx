import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanelDialog } from './PanelDialog'

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

beforeEach(() => {
  replace.mockClear()
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
  })
})

describe('PanelDialog', () => {
  it('se abre como modal: es lo único que deja el fondo inerte', () => {
    render(
      <PanelDialog closeHref="/panel" title="Añadir regalo">
        <p>contenido</p>
      </PanelDialog>,
    )
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('el aspa cierra el diálogo y vuelve a la dirección de origen', () => {
    render(
      <PanelDialog closeHref="/panel/eventos/boda/regalos" title="Añadir regalo">
        <p>contenido</p>
      </PanelDialog>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
    // `replace` y no `push`: volver atrás no debe reabrir el diálogo.
    expect(replace).toHaveBeenCalledWith('/panel/eventos/boda/regalos')
  })

  it('el título nombra al diálogo para quien navega con lector de pantalla', () => {
    render(
      <PanelDialog closeHref="/panel" title="Abrir un fondo">
        <p>contenido</p>
      </PanelDialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Abrir un fondo' })).toBeInTheDocument()
  })
})
