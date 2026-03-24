import api from '../api'

const mockFetch = jest.fn()

const okResponse = (data: any = {}) =>
  Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response)

describe('ApiClient product SEO payload mapping', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // @ts-expect-error overwrite global fetch for tests
    global.fetch = mockFetch
  })

  it('includes SEO fields in createProduct payload', async () => {
    mockFetch.mockReturnValue(okResponse({ data: { id: 1 } }))

    await api.createProduct({
      name: 'HP ProBook 430 G7',
      SKU: 'SKU-123',
      category: 10,
      brand: 20,
      price: '100',
      basePrice: 90,
      metaTitle: 'HP ProBook 430 G7',
      metaDescription: 'Powerful business laptop',
      metaKeywords: 'hp, laptop, business',
      ogImage: 'https://example.com/og.jpg',
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'HP ProBook 430 G7',
      },
    })

    const requestOptions = mockFetch.mock.calls[0][1]
    const parsedBody = JSON.parse(requestOptions.body)

    expect(parsedBody).toEqual(
      expect.objectContaining({
        metaTitle: 'HP ProBook 430 G7',
        metaDescription: 'Powerful business laptop',
        metaKeywords: 'hp, laptop, business',
        ogImage: 'https://example.com/og.jpg',
        schemaMarkup: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'HP ProBook 430 G7',
        },
      }),
    )
  })
})
