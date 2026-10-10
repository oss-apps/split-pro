const INVITE_COOLDOWN_MS = 60_000;
type InviteCooldownKey = `${number}:${number}`;
const lastInviteAtByUserPair = new Map<InviteCooldownKey, number>();
let nextCleanupAt = 0;

export const claimInviteCooldown = (
  inviteeId: number,
  inviterId: number,
  now = Date.now(),
): boolean => {
  const userPair: InviteCooldownKey = `${inviteeId}:${inviterId}`;
  const lastInviteAt = lastInviteAtByUserPair.get(userPair);
  if (undefined !== lastInviteAt && now - lastInviteAt < INVITE_COOLDOWN_MS) {
    return false;
  }

  if (now >= nextCleanupAt) {
    lastInviteAtByUserPair.forEach((inviteAt, pair) => {
      if (now - inviteAt >= INVITE_COOLDOWN_MS) {
        lastInviteAtByUserPair.delete(pair);
      }
    });
    nextCleanupAt = now + INVITE_COOLDOWN_MS;
  }

  lastInviteAtByUserPair.set(userPair, now);
  return true;
};
