import { NextRequest, NextResponse } from 'next/server';

const IMAGE_SERVER_BASE = 'http://164.92.249.220:9000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const imagePath = Array.isArray(path) ? path.join('/') : path;
    
    // Construct the full URL to the image server
    const imageUrl = `${IMAGE_SERVER_BASE}/${imagePath}`;
    
    // Fetch the image from the HTTP server
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Next.js Image Proxy',
      },
    });

    if (!imageResponse.ok) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}

