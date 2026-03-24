import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_ECOM_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const BG_REMOVER_ENABLED = process.env.BG_REMOVER_ENABLED === 'true';
const BG_REMOVER_API_URL = process.env.BG_REMOVER_API_URL?.replace(/\/$/, '') || '';
const BG_REMOVER_TIMEOUT_MS = Number(process.env.BG_REMOVER_TIMEOUT_MS || 15000);

function withPngExtension(filename: string): string {
  if (!filename.includes('.')) return `${filename}.png`;
  return filename.replace(/\.[^.]+$/, '.png');
}

async function maybeRemoveBackground(file: File, force = false): Promise<File> {
  const shouldAttempt = (force || BG_REMOVER_ENABLED) && file.type.startsWith('image/');
  if (!shouldAttempt) {
    return file;
  }
  if (!BG_REMOVER_API_URL) {
    if (force) {
      throw new Error('Background remover API URL is not configured');
    }
    return file;
  }

  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BG_REMOVER_TIMEOUT_MS);

  try {
    const removerResponse = await fetch(`${BG_REMOVER_API_URL}/remove-bg`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!removerResponse.ok) {
      if (force) {
        throw new Error(`Background remover failed: ${removerResponse.status}`);
      }
      return file;
    }

    const contentType = removerResponse.headers.get('content-type') || 'image/png';
    const bytes = await removerResponse.arrayBuffer();
    const processed = new File([bytes], withPngExtension(file.name), {
      type: contentType,
    });
    return processed;
  } catch (error) {
    if (force) {
      throw error;
    }
    return file;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const forceBgRemoval =
      request.nextUrl?.searchParams.get('removeBackground') === '1' ||
      request.nextUrl?.searchParams.get('removeBackground') === 'true';
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Get admin JWT token from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('admin_jwt')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Forward the file to the NestJS backend
    const backendFormData = new FormData();
    const fileToUpload = await maybeRemoveBackground(file, forceBgRemoval);
    backendFormData.append('file', fileToUpload);

    const response = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Image upload failed: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    // Transform backend FileMetadata -> frontend expected shape
    const backendData = await response.json();
    return NextResponse.json({
      id: backendData.id || Date.now(),
      url: backendData.url,
      name: backendData.originalName || backendData.name || file.name,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

