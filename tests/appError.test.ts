import { z } from 'zod';

import { AppError, getAppErrorCode } from '~/server/api/appError';

describe('getAppErrorCode', () => {
  describe('when the cause is an AppError', () => {
    it('returns its code', () => {
      expect(getAppErrorCode(new AppError('SOME_CODE', 'failed'))).toBe('SOME_CODE');
    });
  });

  describe('when the cause is not an AppError', () => {
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
});
