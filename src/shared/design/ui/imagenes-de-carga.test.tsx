import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ImagenConCarga from './ImagenConCarga'
import ImagenQueAparece from './ImagenQueAparece'

describe('ImagenConCarga', () => {
  it('enseña el hueco mientras carga y lo quita al llegar', async () => {
    render(<ImagenConCarga alt="portada" className="rounded" height={10} src="/a.png" width={10} />)
    const img = screen.getByAltText('portada')
    expect(img.className).toContain('imagen-cargando')
    fireEvent.load(img)
    // Next avisa de la carga tras `decode()`: asíncrono.
    await waitFor(() => expect(img.className).not.toContain('imagen-cargando'))
    expect(img.className).toContain('rounded')
  })
})

describe('ImagenQueAparece', () => {
  it('si aún no llegó, se esconde y aparece con fundido al cargar, conservando su opacidad', async () => {
    render(<ImagenQueAparece alt="fondo" height={10} src="/b.png" style={{ opacity: 0.8 }} width={10} />)
    const img = screen.getByAltText('fondo')
    expect(img.style.opacity).toBe('0')
    fireEvent.load(img)
    await waitFor(() => expect(img.style.opacity).toBe('0.8'))
    expect(img.style.transition).toContain('opacity')
  })
})
