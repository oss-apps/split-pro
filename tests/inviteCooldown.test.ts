import { claimInviteCooldown } from '~/lib/inviteCooldown';

describe('claimInviteCooldown', () => {
  describe('when the same inviter invites the same user within 60 seconds', () => {
    it('rejects the second request', () => {
      expect(claimInviteCooldown(2, 1, 10_000)).toBe(true);
      expect(claimInviteCooldown(2, 1, 69_999)).toBe(false);
    });
  });

  describe('when the cooldown has expired', () => {
    it('allows another invite after 60 seconds', () => {
      expect(claimInviteCooldown(3, 2, 10_000)).toBe(true);
      expect(claimInviteCooldown(3, 2, 70_000)).toBe(true);
    });
  });

  describe('when different inviters invite the same user', () => {
    it('tracks each inviter and invitee pair independently', () => {
      expect(claimInviteCooldown(4, 3, 10_000)).toBe(true);
      expect(claimInviteCooldown(4, 5, 10_001)).toBe(true);
    });
  });

  describe('when the same inviter invites different users', () => {
    it('tracks each inviter and invitee pair independently', () => {
      expect(claimInviteCooldown(7, 6, 10_000)).toBe(true);
      expect(claimInviteCooldown(8, 6, 10_001)).toBe(true);
    });
  });
});
