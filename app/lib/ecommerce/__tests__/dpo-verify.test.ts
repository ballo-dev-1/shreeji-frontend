/**
 * TDD Tests for DPO Payment Verification API function
 */

global.fetch = jest.fn();

describe('verifyDpoPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    delete process.env.NEXT_PUBLIC_ECOM_API_URL;
    process.env.NEXT_PUBLIC_ECOM_API_URL = 'http://localhost:4000';
  });

  it('should POST to /payments/dpo/verify with transactionToken', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        orderId: 42,
        orderNumber: 'ORD-001',
        paymentStatus: 'approved',
        message: 'Payment verified successfully',
      }),
    });

    const { verifyDpoPayment } = await import('../api');

    const result = await verifyDpoPayment('test-token-123');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/payments/dpo/verify');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      transactionToken: 'test-token-123',
    });
  });

  it('should return typed success response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        orderId: 42,
        orderNumber: 'ORD-001',
        paymentStatus: 'approved',
        message: 'Payment verified successfully',
      }),
    });

    const { verifyDpoPayment } = await import('../api');

    const result = await verifyDpoPayment('token-abc');

    expect(result.success).toBe(true);
    expect(result.orderId).toBe(42);
    expect(result.orderNumber).toBe('ORD-001');
    expect(result.paymentStatus).toBe('approved');
    expect(result.message).toBe('Payment verified successfully');
  });

  it('should return failure response for declined payments', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        orderId: 43,
        orderNumber: 'ORD-002',
        paymentStatus: 'declined',
        message: 'Payment declined',
      }),
    });

    const { verifyDpoPayment } = await import('../api');

    const result = await verifyDpoPayment('token-fail');

    expect(result.success).toBe(false);
    expect(result.paymentStatus).toBe('declined');
  });

  it('should throw on HTTP error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal Server Error' }),
    });

    const { verifyDpoPayment } = await import('../api');

    await expect(verifyDpoPayment('token-err')).rejects.toThrow();
  });
});
