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
  it('los contratos viven en la tarjeta de su proveedor', () => {
    render(<DocumentsBoard documentos={[doc('contrato-foto', { vendorId: 'v1' })]} evento={evento} proveedores={proveedores} />)
    const foto = screen.getByRole('region', { name: 'Fotógrafo · Luz Estudio' })
    expect(within(foto).getByRole('link', { name: /contrato-foto\.pdf/ })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Salón · Hacienda' })).getByText(/Arrastra aquí/)).toBeInTheDocument()
  })

  it('soltar un archivo en un proveedor lo sube enlazado a él, sin formulario previo', async () => {
    render(<DocumentsBoard documentos={[]} evento={evento} proveedores={proveedores} />)
    const zona = within(screen.getByRole('region', { name: 'Salón · Hacienda' })).getByText(/Arrastra aquí/).closest('label')!
    const archivo = new File(['x'], 'contrato.pdf', { type: 'application/pdf' })
    fireEvent.drop(zona, { dataTransfer: { files: [archivo] } })
    await waitFor(() => expect(subir).toHaveBeenCalled())
    const fd = (subir.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(fd.get('vendorId')).toBe('v2')
    expect(fd.get('kind')).toBe('contrato')
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
