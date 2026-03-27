import { NextRequest, NextResponse } from 'next/server';

const BG_REMOVER_API_URL = process.env.BG_REMOVER_API_URL?.replace(/\/$/, '') || '';
const BG_REMOVER_TIMEOUT_MS = Number(process.env.BG_REMOVER_TIMEOUT_MS || 15000);

export async function POST(request: NextRequest) {
  try {
    if (!BG_REMOVER_API_URL) {
      return NextResponse.json(
        { error: 'Background remover API URL is not configured' },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('admin_jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const payload = new FormData();
    payload.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BG_REMOVER_TIMEOUT_MS);

    try {
      const response = await fetch(`${BG_REMOVER_API_URL}/remove-bg`, {
        method: 'POST',
        body: payload,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: errorText || `Background remover failed: ${response.status}` },
          { status: response.status },
        );
      }

      const bytes = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to remove background' },
      { status: 500 },
    );
  }
}
