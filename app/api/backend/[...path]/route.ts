import { NextRequest, NextResponse } from 'next/server';

// Server-side backend URL: supports internal HTTP even when frontend is HTTPS.
const BACKEND_URL =
  process.env.BACKEND_API_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_ECOM_API_URL?.replace(/\/$/, '') ||
  'http://164.92.249.220:4000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, 'DELETE');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string,
) {
  try {
    const path = '/' + pathSegments.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    const fullPath = `${path}${queryString}`;

    let body: BodyInit | undefined;
    const contentType = request.headers.get('content-type');
    if (method !== 'GET' && method !== 'DELETE') {
      if (contentType?.includes('application/json')) {
        body = await request.text();
      } else if (contentType?.includes('multipart/form-data')) {
        body = await request.formData();
      } else {
        body = await request.text();
      }
    }
    const headers: HeadersInit = {};
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== 'host' &&
        lowerKey !== 'connection' &&
        lowerKey !== 'content-length'
      ) {
        headers[key] = value;
      }
    });
    const backendUrl = `${BACKEND_URL}${fullPath}`;
    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
      // Keep redirect chain visible to browser, especially for OAuth.
      redirect: 'manual',
    });

    const responseBuffer = await response.arrayBuffer();
    const proxyResponse = new NextResponse(responseBuffer, {
      status: response.status,
      statusText: response.statusText,
    });

    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== 'content-encoding' &&
        lowerKey !== 'transfer-encoding' &&
        lowerKey !== 'connection'
      ) {
        proxyResponse.headers.set(key, value);
      }
    });
    return proxyResponse;
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', message: error.message },
      { status: 500 },
    );
  }
}
