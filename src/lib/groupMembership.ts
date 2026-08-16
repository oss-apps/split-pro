export const getDuplicateGroupMemberIds = (
  existingUserIds: readonly number[],
  requestedUserIds: readonly number[],
) => {
  const existingIds = new Set(existingUserIds);

  return [...new Set(requestedUserIds.filter((userId) => existingIds.has(userId)))];
};
