import { NextRequest, NextResponse } from 'next/server';

// Backend URL - server-side only, can use HTTP
const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '') || process.env.NEXT_PUBLIC_ECOM_API_URL?.replace(/\/$/, '') || 'http://164.92.249.220:4000';

// #region agent log
const LOG_ENDPOINT = 'http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d';
// #endregion

async function logDebug(location: string, message: string, data: any) {
  try {
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        message,
        data,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'proxy-request',
        hypothesisId: 'proxy-implementation'
      })
    }).catch(() => {});
  } catch {}
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'DELETE');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  // #region agent log
  await logDebug('proxy-request:entry', 'Proxy request started', {
    method,
    pathSegments,
    backendUrl: BACKEND_URL
  });
  // #endregion

  try {
    // Reconstruct the path
    const path = '/' + pathSegments.join('/');
    
    // Get query string
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    const fullPath = `${path}${queryString}`;
    
    // #region agent log
    await logDebug('proxy-request:path', 'Path constructed', { path, fullPath, queryString });
    // #endregion
    
    // Get request body for POST/PUT/PATCH
    let body: BodyInit | undefined;
    const contentType = request.headers.get('content-type');
    
    if (method !== 'GET' && method !== 'DELETE') {
      if (contentType?.includes('application/json')) {
        body = await request.text();
        // #region agent log
        await logDebug('proxy-request:body', 'Body extracted (JSON)', { bodyLength: body.length });
        // #endregion
      } else if (contentType?.includes('multipart/form-data')) {
        body = await request.formData();
        // #region agent log
        await logDebug('proxy-request:body', 'Body extracted (FormData)', {});
        // #endregion
      } else {
        body = await request.text();
        // #region agent log
        await logDebug('proxy-request:body', 'Body extracted (text)', { bodyLength: body.length });
        // #endregion
      }
    }
    
    // Forward headers (but exclude host and connection headers)
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
    
    // Make request to backend
    const backendUrl = `${BACKEND_URL}${fullPath}`;
    
    // #region agent log
    await logDebug('proxy-request:before-fetch', 'About to fetch from backend', { backendUrl, method });
    // #endregion
    
    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
    });
    
    // #region agent log
    await logDebug('proxy-request:after-fetch', 'Backend response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    // #endregion
    
    // Get response body
    const responseText = await response.text();
    
    // #region agent log
    await logDebug('proxy-request:response-body', 'Response body extracted', {
      bodyLength: responseText.length,
      status: response.status
    });
    // #endregion
    
    // Create response with same status and headers
    const proxyResponse = new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
    });
    
    // Copy relevant headers
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
    
    // #region agent log
    await logDebug('proxy-request:success', 'Proxy response created', {
      status: proxyResponse.status,
      hasBody: !!responseText
    });
    // #endregion
    
    return proxyResponse;
  } catch (error: any) {
    // #region agent log
    await logDebug('proxy-request:error', 'Proxy error occurred', {
      errorMessage: error.message,
      errorStack: error.stack
    });
    // #endregion
    
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', message: error.message },
      { status: 500 }
    );
  }
}

