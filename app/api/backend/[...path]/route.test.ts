jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: class {
    status: number;
    statusText: string;
    headers: Headers;
    body: unknown;

    constructor(body?: unknown, init?: { status?: number; statusText?: string }) {
      this.body = body ?? '';
      this.status = init?.status ?? 200;
      this.statusText = init?.statusText ?? 'OK';
      this.headers = new Headers();
    }

    static json(body: unknown, init?: { status?: number }) {
      return {
        status: init?.status ?? 200,
        json: async () => body,
      };
    }
  },
}));

describe('backend proxy route', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_ECOM_API_URL = 'http://example-backend:4000';
    (global.fetch as jest.Mock) = jest.fn();
  });

  it('does not auto-follow redirect responses from backend', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 302,
      statusText: 'Found',
      arrayBuffer: async () => new ArrayBuffer(0),
      headers: new Headers({
        location: 'https://accounts.google.com/o/oauth2/v2/auth?foo=bar',
      }),
    });

    const { GET } = await import('./route');
    const req = {
      headers: new Headers(),
      nextUrl: {
        searchParams: new URLSearchParams('redirect_uri=https://site/portal/login'),
      },
    } as any;

    const response = await GET(req, {
      params: Promise.resolve({ path: ['auth', 'google'] }),
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(fetchOptions.redirect).toBe('manual');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('accounts.google.com');
  });
  it('preserves binary payloads for image/file responses', async () => {
    const binary = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer;
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => binary,
      headers: new Headers({
        'content-type': 'image/png',
      }),
    });

    const { GET } = await import('./route');
    const req = {
      headers: new Headers(),
      nextUrl: {
        searchParams: new URLSearchParams('path=uploads%2Fsample.png'),
      },
    } as any;

    const response = await GET(req, {
      params: Promise.resolve({ path: ['files', 'serve'] }),
    }) as any;

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.body).toBe(binary);
  });
});
