import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActionFeedback, EmptyState, LoadMoreLink, SubmitButton } from './estados'
import { Field, FIELD_CLASS, PanelButton } from './PanelKit'

describe('SubmitButton', () => {
  it('mientras el formulario se envía se bloquea, dice que espera y lo anuncia', async () => {
    let terminar: () => void = () => {}
    const accion = () => new Promise<void>((resolver) => (terminar = resolver))
    render(
      <form action={accion}>
        <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
      </form>,
    )
    const boton = screen.getByRole('button', { name: 'Guardar' })
    expect(boton).toHaveAttribute('type', 'submit')
    expect(boton).not.toHaveAttribute('aria-busy', 'true')

    await act(async () => {
      fireEvent.submit(boton.closest('form')!)
    })
    const esperando = screen.getByRole('button', { name: 'Guardando…' })
    expect(esperando).toBeDisabled()
    expect(esperando).toHaveAttribute('aria-busy', 'true')

    await act(async () => terminar())
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('fuera de su formulario (atributo form) acepta el estado de fuera', () => {
    render(<SubmitButton pending pendingLabel="Quitando…">Quitar</SubmitButton>)
    expect(screen.getByRole('button', { name: 'Quitando…' })).toBeDisabled()
  })

  it('sin texto de espera propio, conserva el suyo y marca la espera', () => {
    render(<SubmitButton pending>Enviar</SubmitButton>)
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('aria-busy', 'true')
  })
})

describe('ActionFeedback', () => {
  it('no pinta nada en reposo ni con un éxito sin mensaje', () => {
    const { container } = render(
      <>
        <ActionFeedback state={{ status: 'idle' }} />
        <ActionFeedback state={{ status: 'success' }} />
      </>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('con errorsOnly calla el acierto: para las pantallas que ya lo dicen de otra forma', () => {
    const { container } = render(<ActionFeedback errorsOnly state={{ status: 'success', message: 'Guardado.' }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('el error interrumpe y el acierto no', () => {
    render(
      <>
        <ActionFeedback state={{ status: 'error', message: 'No se pudo guardar.' }} />
        <ActionFeedback state={{ status: 'success', message: 'Guardado.' }} />
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar.')
    expect(screen.getByRole('status')).toHaveTextContent('Guardado.')
  })
})

describe('EmptyState', () => {
  it('dice qué falta y ofrece la salida', () => {
    render(<EmptyState action={<PanelButton href="/es#precios">Ver la web</PanelButton>} description="Llegarán desde la web." title="Todavía no hay pedidos." />)
    expect(screen.getByText('Todavía no hay pedidos.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver la web' })).toHaveAttribute('href', '/es#precios')
  })
})

describe('LoadMoreLink', () => {
  it('dice cuántos quedan en su nombre accesible y no se pinta si no queda nada', () => {
    const { rerender } = render(<LoadMoreLink href="/panel/pedidos?n=40" noun="pedidos" remaining={5} />)
    const enlace = screen.getByRole('link', { name: 'Ver 5 pedidos más' })
    expect(enlace).toHaveAttribute('href', '/panel/pedidos?n=40')
    rerender(<LoadMoreLink href="/panel/pedidos?n=40" noun="pedidos" remaining={0} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('sin total conocido, dice «Ver más»', () => {
    render(<LoadMoreLink href="/panel/pedidos?n=40" noun="pedidos" />)
    expect(screen.getByRole('link', { name: 'Ver más pedidos' })).toBeInTheDocument()
  })
})

describe('Field con ayuda y error', () => {
  it('ata la ayuda y el error al campo, y marca el campo inválido', () => {
    render(
      <Field error="Escribe un correo válido." hint="Le mandamos el acceso aquí." label="Correo" required>
        {(props) => <input className={FIELD_CLASS} {...props} />}
      </Field>,
    )
    const campo = screen.getByLabelText(/Correo/)
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toBeRequired()
    expect(campo).toHaveAccessibleDescription('Le mandamos el acceso aquí. Escribe un correo válido.')
  })

  it('sigue funcionando con htmlFor y un campo escrito a mano', () => {
    render(
      <Field htmlFor="plan" label="Plan">
        <input id="plan" />
      </Field>,
    )
    expect(screen.getByLabelText('Plan')).not.toHaveAttribute('aria-invalid')
  })
})

describe('PanelButton en los bordes', () => {
  it('un enlace deshabilitado no navega y lo dice', () => {
    render(
      <PanelButton disabled href="/panel/pedidos">
        Abrir
      </PanelButton>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Abrir').closest('[aria-disabled="true"]')).not.toBeNull()
  })

  it('sin aria-label, el aviso de pestaña nueva se suma a su texto con su espacio', () => {
    render(
      <PanelButton external href="https://wa.me/591700">
        WhatsApp
      </PanelButton>,
    )
    expect(screen.getByRole('link', { name: 'WhatsApp (se abre en una pestaña nueva)' })).toBeInTheDocument()
  })

  it('el enlace externo avisa de que abre otra pestaña y conserva sus atributos aria', () => {
    render(
      <PanelButton aria-label="Escribir por WhatsApp a Ana" external href="https://wa.me/591700">
        WhatsApp
      </PanelButton>,
    )
    const enlace = screen.getByRole('link', { name: /Escribir por WhatsApp a Ana/ })
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAccessibleName('Escribir por WhatsApp a Ana (se abre en una pestaña nueva)')
  })
})
