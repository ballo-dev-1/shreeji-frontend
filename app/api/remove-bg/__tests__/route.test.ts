jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: class {
    status: number;
    headers: Headers;
    body: unknown;

    constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers || {});
    }

    static json(body: unknown, init?: { status?: number }) {
      return {
        status: init?.status ?? 200,
        json: async () => body,
      };
    }
  },
}));

describe('remove-bg route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as any) = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createRequest(withToken = true): any {
    const formData = new FormData();
    formData.append('file', new File(['img'], 'a.png', { type: 'image/png' }));
    const headers = new Headers();
    if (withToken) headers.set('authorization', 'Bearer token');

    return {
      headers,
      cookies: { get: () => undefined },
      formData: async () => formData,
    };
  }

  it('returns 500 when BG_REMOVER_API_URL is missing', async () => {
    delete process.env.BG_REMOVER_API_URL;
    const { POST } = await import('../route');
    const response = await POST(createRequest());
    expect(response.status).toBe(500);
  });

  it('forwards request and returns binary response', async () => {
    process.env.BG_REMOVER_API_URL = 'http://bg-remover:4200';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
      headers: new Headers({ 'content-type': 'image/png' }),
    });

    const { POST } = await import('../route');
    const response = (await POST(createRequest())) as any;

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'http://bg-remover:4200/remove-bg',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
  });
});
