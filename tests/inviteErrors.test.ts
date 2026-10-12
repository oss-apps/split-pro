import {
  InviteErrorCode,
  getInviteErrorToastKey,
  isInviteEmailSendFailed,
} from '~/lib/error/invite';

describe('isInviteEmailSendFailed', () => {
  describe('when given the delivery failure code', () => {
    it('returns true', () => {
      expect(isInviteEmailSendFailed(InviteErrorCode.INVITE_EMAIL_SEND_FAILED)).toBe(true);
    });
  });

  describe('when given another code', () => {
    it.each([
      InviteErrorCode.INVITES_DISABLED,
      InviteErrorCode.INVITE_RATE_LIMITED,
      undefined,
      null,
      123,
      {},
      'SOME_UNRELATED_CODE',
      '',
    ])('returns false for %p', (value) => {
      expect(isInviteEmailSendFailed(value)).toBe(false);
    });
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
