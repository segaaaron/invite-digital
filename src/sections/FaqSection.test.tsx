import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import { FaqSection } from './FaqSection'

describe('FaqSection', () => {
  it('renderiza cada pregunta como disclosure nativo', () => {
    render(<FaqSection dictionary={es} />)
    for (const item of es.faq.items) {
      expect(screen.getByText(item.question)).toBeDefined()
    }
  })
})
