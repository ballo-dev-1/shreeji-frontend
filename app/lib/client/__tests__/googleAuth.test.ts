import { buildGoogleAuthUrl } from '@/app/lib/client/googleAuth';

describe('buildGoogleAuthUrl', () => {
  it('uses proxy url on https pages when backend api is http', () => {
    const url = buildGoogleAuthUrl({
      apiUrl: 'http://164.92.249.220:4000',
      protocol: 'https:',
      origin: 'https://shreeji-staging.vercel.app',
    });

    expect(url).toBe(
      '/api/backend/auth/google?redirect_uri=https%3A%2F%2Fshreeji-staging.vercel.app%2Fportal%2Flogin',
    );
  });

  it('uses direct backend url when protocol is http', () => {
    const url = buildGoogleAuthUrl({
      apiUrl: 'http://localhost:4000',
      protocol: 'http:',
      origin: 'http://localhost:3001',
    });

    expect(url).toBe(
      'http://localhost:4000/auth/google?redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fportal%2Flogin',
    );
  });

  it('always normalizes redirect path to /portal/login', () => {
    const url = buildGoogleAuthUrl({
      apiUrl: 'https://api.example.com/',
      protocol: 'https:',
      origin: 'https://shreeji-staging.vercel.app/',
    });

    expect(url).toBe(
      'https://api.example.com/auth/google?redirect_uri=https%3A%2F%2Fshreeji-staging.vercel.app%2Fportal%2Flogin',
    );
  });
});
