import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { FiestaChooser } from './FiestaChooser'

describe('FiestaChooser', () => {
  it('la portada ofrece las dos fiestas, cada una a su página', () => {
    const dictionary = getDictionary('es')
    render(<FiestaChooser dictionary={dictionary} locale="es" />)
    expect(screen.getByRole('link', { name: new RegExp(dictionary.fiestas.boda.cardTitle) })).toHaveAttribute('href', '/es/bodas')
    expect(screen.getByRole('link', { name: new RegExp(dictionary.fiestas.xv.cardTitle) })).toHaveAttribute('href', '/es/xv-anos')
  })
})
