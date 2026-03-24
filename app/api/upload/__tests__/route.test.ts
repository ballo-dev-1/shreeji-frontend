jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

describe('upload route background removal', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as any) = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createRequest(options?: {
    withHeaderToken?: boolean;
    withCookieToken?: boolean;
    fileType?: string;
  }): any {
    const formData = new FormData();
    const file = new File(['fake-image'], 'sample.png', {
      type: options?.fileType ?? 'image/png',
    });
    formData.append('file', file);

    const headers = new Headers();
    if (options?.withHeaderToken) {
      headers.set('authorization', 'Bearer header-token');
    }

    return {
      formData: async () => formData,
      headers,
      cookies: {
        get: (key: string) =>
          key === 'admin_jwt' && options?.withCookieToken
            ? { value: 'cookie-token' }
            : undefined,
      },
    };
  }

  it('keeps existing direct upload when bg remover is off', async () => {
    process.env.NEXT_PUBLIC_ECOM_API_URL = 'http://example-backend:4000';
    process.env.BG_REMOVER_ENABLED = 'false';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, url: '/uploads/a.png', originalName: 'a.png' }),
    });

    const { POST } = await import('../route');
    const response = await POST(createRequest({ withHeaderToken: true }));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'http://example-backend:4000/files/upload',
    );
    expect(response.status).toBe(200);
  });

  it('uses bg remover first when enabled and forwards processed file', async () => {
    process.env.NEXT_PUBLIC_ECOM_API_URL = 'http://example-backend:4000';
    process.env.BG_REMOVER_ENABLED = 'true';
    process.env.BG_REMOVER_API_URL = 'http://bg-remover:4200';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode('processed').buffer,
        headers: new Headers({ 'content-type': 'image/png' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 2, url: '/uploads/b.png', originalName: 'b.png' }),
      });

    const { POST } = await import('../route');
    const response = await POST(createRequest({ withHeaderToken: true }));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'http://bg-remover:4200/remove-bg',
    );
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe(
      'http://example-backend:4000/files/upload',
    );
    expect(response.status).toBe(200);
  });

  it('falls back to original upload when bg remover fails', async () => {
    process.env.NEXT_PUBLIC_ECOM_API_URL = 'http://example-backend:4000';
    process.env.BG_REMOVER_ENABLED = 'true';
    process.env.BG_REMOVER_API_URL = 'http://bg-remover:4200';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'failed',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 3, url: '/uploads/c.png', originalName: 'c.png' }),
      });

    const { POST } = await import('../route');
    const response = await POST(createRequest({ withHeaderToken: true }));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe(
      'http://example-backend:4000/files/upload',
    );
    expect(response.status).toBe(200);
  });

  it('uses cookie token when auth header is absent', async () => {
    process.env.NEXT_PUBLIC_ECOM_API_URL = 'http://example-backend:4000';
    process.env.BG_REMOVER_ENABLED = 'false';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 4, url: '/uploads/d.png', originalName: 'd.png' }),
    });

    const { POST } = await import('../route');
    await POST(createRequest({ withCookieToken: true }));

    const backendCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(backendCall[1].headers.Authorization).toBe('Bearer cookie-token');
  });
});
