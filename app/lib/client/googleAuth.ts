const PORTAL_LOGIN_PATH = '/portal/login';

function normalizeApiUrl(url?: string): string {
  return (url || '').replace(/\/$/, '');
}

function getRedirectUri(origin?: string): string {
  if (!origin) return '';
  return `${origin.replace(/\/$/, '')}${PORTAL_LOGIN_PATH}`;
}

export function buildGoogleAuthUrl({
  apiUrl,
  protocol,
  origin,
}: {
  apiUrl?: string;
  protocol?: string;
  origin?: string;
}): string {
  const normalizedApiUrl = normalizeApiUrl(apiUrl) || 'http://localhost:4000';
  const shouldUseProxy =
    protocol === 'https:' && normalizedApiUrl.startsWith('http://');

  const baseUrl = shouldUseProxy
    ? '/api/backend/auth/google'
    : `${normalizedApiUrl}/auth/google`;
  const redirectUri = getRedirectUri(origin);

  if (!redirectUri) return baseUrl;

  return `${baseUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`;
}
