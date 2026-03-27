import { getLoginUrl, isSafeReturnUrl } from '@/app/lib/client/redirectToLogin';

describe('redirectToLogin safety', () => {
  it('blocks backend google callback path from returnUrl', () => {
    expect(isSafeReturnUrl('/api/backend/auth/google/callback')).toBe(false);
    expect(
      isSafeReturnUrl('/api/backend/auth/google/callback?code=abc'),
    ).toBe(false);
    expect(isSafeReturnUrl('/api/backend/auth/google')).toBe(false);
  });

  it('keeps normal app pages as safe return targets', () => {
    expect(isSafeReturnUrl('/checkout')).toBe(true);
    expect(isSafeReturnUrl('/portal/orders/123')).toBe(true);
  });

  it('omits blocked callback from generated login URL', () => {
    expect(getLoginUrl('/api/backend/auth/google/callback')).toBe('/portal/login');
  });
});
