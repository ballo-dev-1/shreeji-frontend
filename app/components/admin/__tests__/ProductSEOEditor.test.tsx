import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProductSEOEditor from '../ProductSEOEditor'

describe('ProductSEOEditor', () => {
  const getSchemaTextarea = () => {
    const textboxes = screen.getAllByRole('textbox')
    return textboxes[textboxes.length - 1] as HTMLTextAreaElement
  }

  it('normalizes schemaMarkup when provided as valid JSON string', () => {
    const onChange = jest.fn()

    render(
      <ProductSEOEditor
        seoData={{
          // backend can send this as a JSON string
          schemaMarkup: '{"@context":"https://schema.org","@type":"Product","name":"HP ProBook 430 G7"}' as any,
        }}
        onChange={onChange}
      />,
    )

    const schemaTextarea = getSchemaTextarea()
    expect(schemaTextarea.value).toContain('"@context": "https://schema.org"')
    expect(schemaTextarea.value).toContain('"@type": "Product"')
    expect(schemaTextarea.value).not.toContain('\\"@context\\"')
  })

  it('does not crash while editing invalid schema JSON', async () => {
    const onChange = jest.fn()

    render(
      <ProductSEOEditor
        seoData={{}}
        onChange={onChange}
      />,
    )

    const schemaTextarea = getSchemaTextarea()
    fireEvent.change(schemaTextarea, {
      target: { value: '{"@context":"https://schema.org",' },
    })

    await waitFor(() => {
      expect(screen.getByText('Invalid JSON')).toBeInTheDocument()
    })
  })
})
