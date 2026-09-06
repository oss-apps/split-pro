export const InviteErrorCode = {
  INVITES_DISABLED: 'INVITES_DISABLED',
  INVITE_RATE_LIMITED: 'INVITE_RATE_LIMITED',
  INVITE_EMAIL_SEND_FAILED: 'INVITE_EMAIL_SEND_FAILED',
} as const;

const inviteErrorCodes: string[] = Object.values(InviteErrorCode);

export function isInviteErrorCode(appErrorCode: unknown): boolean {
  return 'string' === typeof appErrorCode && inviteErrorCodes.includes(appErrorCode);
}

export function getInviteErrorToastKey(
  appErrorCode: string | null | undefined,
): 'errors.invite_email_failed' | 'errors.add_member_failed' {
  return InviteErrorCode.INVITE_EMAIL_SEND_FAILED === appErrorCode
    ? 'errors.invite_email_failed'
    : 'errors.add_member_failed';
}
