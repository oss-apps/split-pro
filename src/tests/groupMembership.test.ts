import { getDuplicateGroupMemberIds } from '~/lib/groupMembership';

describe('getDuplicateGroupMemberIds', () => {
  it('returns each already-member user once', () => {
    expect(getDuplicateGroupMemberIds([1, 2], [2, 2, 3, 1])).toEqual([2, 1]);
  });

  it('returns no duplicates for new members', () => {
    expect(getDuplicateGroupMemberIds([1, 2], [3, 4])).toEqual([]);
  });
});
