import { normalizeImageUrl } from '@/app/lib/admin/image-mapping';

describe('normalizeImageUrl', () => {
  it('routes backend /files/serve absolute URLs through Next API proxy', () => {
    const input =
      'http://164.92.249.220:4000/files/serve?path=uploads%2Fcamera.png';

    expect(normalizeImageUrl(input)).toBe(
      '/api/backend/files/serve?path=uploads%2Fcamera.png',
    );
  });

  it('routes backend /files/serve relative paths through Next API proxy', () => {
    const input = '/files/serve?path=uploads%2Fcamera.png';

    expect(normalizeImageUrl(input)).toBe(
      '/api/backend/files/serve?path=uploads%2Fcamera.png',
    );
  });

  it('rewrites legacy minio urls to /api/images proxy', () => {
    const input = 'http://164.92.249.220:9000/shreeji-uploads/uploads/x.png';

    expect(normalizeImageUrl(input)).toBe(
      '/api/images/shreeji-uploads/uploads/x.png',
    );
  });
});
