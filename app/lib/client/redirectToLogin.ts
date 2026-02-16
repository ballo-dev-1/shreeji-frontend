/**
 * Builds the portal login URL with an optional return URL so users can resume
 * their journey after logging in instead of always landing on the portal.
 *
 * Use getLoginUrl() when redirecting to login (router.push(getLoginUrl()) or
 * window.location.href = getLoginUrl()). When returnUrl is omitted, the current
 * page path + search is used (client-side only).
 */

const LOGIN_PATH = '/portal/login';

/**
 * Validates that a return URL is a safe relative path (no open redirects).
 */
export function isSafeReturnUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !/^https?:\/\//i.test(trimmed)
  );
}

/**
 * Returns the portal login URL with optional returnUrl query param.
 * When returnUrl is omitted and running in the browser, uses the current path + search.
 * Validates returnUrl to prevent open redirects; invalid values are not added.
 */
export function getLoginUrl(returnUrl?: string): string {
  let target = returnUrl;

  if (target === undefined || target === '') {
    if (typeof window !== 'undefined') {
      target = window.location.pathname + window.location.search;
    } else {
      target = '';
    }
  }

  if (!target || !isSafeReturnUrl(target)) {
    return LOGIN_PATH;
  }

  const encoded = encodeURIComponent(target);
  return `${LOGIN_PATH}?returnUrl=${encoded}`;
}
