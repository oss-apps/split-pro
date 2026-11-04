import { env } from '~/env';
import { appRouter } from '~/server/api/root';
import { createInnerTRPCContext } from '~/server/api/trpc';

import { db } from './database';
import { expenseInput, testUser } from './factories';
import { callerFor, sessionFor } from './trpc';

describe('user discovery', () => {
  const originalEnabled = env.ENABLE_USER_DISCOVERY;

  afterEach(() => {
    jest.replaceProperty(env, 'ENABLE_USER_DISCOVERY', originalEnabled);
  });

  it('returns no other users when disabled', async () => {
    jest.replaceProperty(env, 'ENABLE_USER_DISCOVERY', false);
    const owner = await testUser();
    await testUser('Other user');

    expect(await callerFor(owner.id).user.getDiscoverableUsers()).toEqual([]);
  });

  it('discovers strangers and hidden friends without changing the friends list', async () => {
    jest.replaceProperty(env, 'ENABLE_USER_DISCOVERY', true);
    const owner = await testUser('Owner');
    const friend = await testUser('Friend');
    const hidden = await testUser('Hidden friend');
    const stranger = await testUser('Stranger');
    const deleted = await testUser('Deleted user');
    await db.user.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });
    await callerFor(owner.id).expense.addOrEditExpense(expenseInput(owner.id, friend.id));
    await callerFor(owner.id).expense.addOrEditExpense(expenseInput(owner.id, hidden.id));
    await callerFor(owner.id).expense.addOrEditExpense(expenseInput(hidden.id, owner.id));
    await db.user.update({
      where: { id: owner.id },
      data: { hiddenFriendIds: [hidden.id] },
    });
    const session = sessionFor(owner.id);
    session.user.hiddenFriendIds = [hidden.id];
    const caller = appRouter.createCaller(createInnerTRPCContext({ session, db }));

    const discovered = await caller.user.getDiscoverableUsers();
    expect(discovered.map((user) => user.id).sort((a, b) => a - b)).toEqual(
      [hidden.id, stranger.id].sort((a, b) => a - b),
    );
    expect((await caller.user.getFriends()).map((user) => user.id)).toEqual([friend.id]);
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).hiddenFriendIds).toEqual([
      hidden.id,
    ]);
  });

  it('returns only picker identity fields for unrelated users', async () => {
    jest.replaceProperty(env, 'ENABLE_USER_DISCOVERY', true);
    const owner = await testUser('Owner');
    const stranger = await testUser('Stranger');
    await db.user.update({
      where: { id: stranger.id },
      data: {
        bankingId: 'private-bank-id',
        obapiProviderId: 'private-provider-id',
        hiddenFriendIds: [owner.id],
      },
    });

    expect(await callerFor(owner.id).user.getDiscoverableUsers()).toEqual([
      { id: stranger.id, name: stranger.name, image: stranger.image },
    ]);
  });

  it('requires authentication even when enabled', async () => {
    jest.replaceProperty(env, 'ENABLE_USER_DISCOVERY', true);
    await expect(callerFor(null).user.getDiscoverableUsers()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});
