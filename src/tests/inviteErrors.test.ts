import { InviteErrorCode, getInviteErrorToastKey, isInviteErrorCode } from '~/lib/error/invite';

describe('isInviteErrorCode', () => {
  describe('when given a known InviteErrorCode value', () => {
    it.each(Object.values(InviteErrorCode))('returns true for %s', (code) => {
      expect(isInviteErrorCode(code)).toBe(true);
    });
  });

  describe('when given anything else', () => {
    it.each([undefined, null, 123, {}, 'SOME_UNRELATED_CODE', ''])(
      'returns false for %p',
      (value) => {
        expect(isInviteErrorCode(value)).toBe(false);
      },
    );
  });
});

describe('getInviteErrorToastKey', () => {
  describe('when the code is INVITE_EMAIL_SEND_FAILED', () => {
    it('returns the invite-email-failed key', () => {
      expect(getInviteErrorToastKey(InviteErrorCode.INVITE_EMAIL_SEND_FAILED)).toBe(
        'errors.invite_email_failed',
      );
    });
  });

  describe('when the code is any other InviteErrorCode value', () => {
    it.each([InviteErrorCode.INVITES_DISABLED, InviteErrorCode.INVITE_RATE_LIMITED])(
      'returns the generic add-member-failed key for %s',
      (code) => {
        expect(getInviteErrorToastKey(code)).toBe('errors.add_member_failed');
      },
    );
  });

  describe('when the code is unknown, null, or undefined', () => {
    it.each(['SOME_UNRELATED_CODE', null, undefined])(
      'returns the generic add-member-failed key for %p',
      (value) => {
        expect(getInviteErrorToastKey(value)).toBe('errors.add_member_failed');
      },
    );
  });
});
