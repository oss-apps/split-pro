export const InviteErrorCode = {
  INVITES_DISABLED: 'INVITES_DISABLED',
  INVITE_RATE_LIMITED: 'INVITE_RATE_LIMITED',
  INVITE_EMAIL_SEND_FAILED: 'INVITE_EMAIL_SEND_FAILED',
} as const;

export const isInviteEmailSendFailed = (appErrorCode: unknown): boolean =>
  InviteErrorCode.INVITE_EMAIL_SEND_FAILED === appErrorCode;

export const getInviteErrorToastKey = (
  appErrorCode: string | null | undefined,
): 'errors.invite_email_failed' | 'errors.add_member_failed' =>
  InviteErrorCode.INVITE_EMAIL_SEND_FAILED === appErrorCode
    ? 'errors.invite_email_failed'
    : 'errors.add_member_failed';

export const getInviteAppErrorCode = (error: unknown): string | undefined => {
  if ('object' !== typeof error || null === error || !('data' in error)) {
    return undefined;
  }
  const data = error.data;
  if ('object' !== typeof data || null === data || !('appErrorCode' in data)) {
    return undefined;
  }
  return 'string' === typeof data.appErrorCode ? data.appErrorCode : undefined;
};
