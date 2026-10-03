import { claimInviteCooldown } from '~/lib/inviteCooldown';

describe('claimInviteCooldown', () => {
  describe('when the same user requests another invite within 60 seconds', () => {
    it('rejects the second request', () => {
      expect(claimInviteCooldown(1, 10_000)).toBe(true);
      expect(claimInviteCooldown(1, 69_999)).toBe(false);
    });
  });

  describe('when the cooldown has expired', () => {
    it('allows another invite after 60 seconds', () => {
      expect(claimInviteCooldown(2, 10_000)).toBe(true);
      expect(claimInviteCooldown(2, 70_000)).toBe(true);
    });
  });

  describe('when different users request invites', () => {
    it('tracks each target independently', () => {
      expect(claimInviteCooldown(3, 10_000)).toBe(true);
      expect(claimInviteCooldown(4, 10_000)).toBe(true);
    });
  });
});
