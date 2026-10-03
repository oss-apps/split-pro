const INVITE_COOLDOWN_MS = 60_000;
const lastInviteAtByUserId = new Map<number, number>();
let nextCleanupAt = 0;

export const claimInviteCooldown = (userId: number, now = Date.now()): boolean => {
  const lastInviteAt = lastInviteAtByUserId.get(userId);
  if (undefined !== lastInviteAt && now - lastInviteAt < INVITE_COOLDOWN_MS) {
    return false;
  }

  if (now >= nextCleanupAt) {
    lastInviteAtByUserId.forEach((inviteAt, id) => {
      if (now - inviteAt >= INVITE_COOLDOWN_MS) {
        lastInviteAtByUserId.delete(id);
      }
    });
    nextCleanupAt = now + INVITE_COOLDOWN_MS;
  }

  lastInviteAtByUserId.set(userId, now);
  return true;
};
