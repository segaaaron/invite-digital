import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DocumentsBoard } from './DocumentsBoard'

const subir = vi.hoisted(() => vi.fn(async () => ({ status: 'success' })))
vi.mock('@/app/_acciones/planner/dia-actions', () => ({ uploadDocumentAction: subir, removeDocumentAction: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const evento = { eventId: 'e1', eventSlug: 'xv' }
const proveedores = [
  { id: 'v1', nombre: 'Fotógrafo · Luz Estudio' },
  { id: 'v2', nombre: 'Salón · Hacienda' },
]
const doc = (id: string, over: object) => ({ id, kind: 'contrato' as const, topic: null, originalName: `${id}.pdf`, peso: '1 MB', vendorId: null, esImagen: false, href: `/d/${id}`, ...over })

describe('DocumentsBoard', () => {
  it('la lista dice de qué proveedor es cada documento', () => {
    render(<DocumentsBoard documentos={[doc('contrato-foto', { vendorId: 'v1' })]} evento={evento} proveedores={proveedores} />)
    const lista = screen.getByRole('region', { name: /Tus documentos/ })
    expect(within(lista).getByRole('link', { name: 'contrato-foto.pdf' })).toBeInTheDocument()
    expect(within(lista).getByText(/Contrato · Fotógrafo · Luz Estudio/)).toBeInTheDocument()
  })

  it('se elige qué es y de qué proveedor, y soltar el archivo lo sube', async () => {
    render(<DocumentsBoard documentos={[]} evento={evento} proveedores={proveedores} />)
    const subida = screen.getByRole('region', { name: 'Subir un documento' })
    fireEvent.click(within(subida).getByRole('radio', { name: 'Cotización' }))
    fireEvent.change(within(subida).getByLabelText(/De qué proveedor/), { target: { value: 'v2' } })
    const zona = within(subida).getByText(/Arrastra aquí/).closest('label')!
    fireEvent.drop(zona, { dataTransfer: { files: [new File(['x'], 'cotizacion.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => expect(subir).toHaveBeenCalled())
    const fd = (subir.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(fd.get('vendorId')).toBe('v2')
    expect(fd.get('kind')).toBe('cotizacion')
  })

  it('la inspiración es un tablero de fotos por tema', () => {
    render(
      <DocumentsBoard
        documentos={[doc('vestido-1', { kind: 'referencia', topic: 'Vestido', esImagen: true, originalName: 'vestido-1.jpg' }), doc('torta-1', { kind: 'referencia', topic: 'Torta', esImagen: true, originalName: 'torta-1.jpg' })]}
        evento={evento}
        proveedores={proveedores}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /Inspiración/ }))
    const vestido = screen.getByRole('region', { name: 'Vestido' })
    expect(within(vestido).getByRole('img', { name: 'vestido-1.jpg' })).toHaveAttribute('src', '/d/vestido-1')
  })
})
