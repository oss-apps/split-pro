import { z } from 'zod';

import { AppError, getAppErrorCode } from '~/server/api/appError';

describe('getAppErrorCode', () => {
  it('returns the code for an AppError cause', () => {
    expect(getAppErrorCode(new AppError('SOME_CODE', 'failed'))).toBe('SOME_CODE');
  });

  it('returns null for undefined', () => {
    expect(getAppErrorCode(undefined)).toBeNull();
  });

  it('returns null for a plain Error', () => {
    expect(getAppErrorCode(new Error('boom'))).toBeNull();
  });

  it('returns null for a ZodError', () => {
    const result = z.string().safeParse(123);
    expect(result.success).toBe(false);
    expect(getAppErrorCode(!result.success ? result.error : undefined)).toBeNull();
  });
});
