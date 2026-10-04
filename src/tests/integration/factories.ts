import {
  createDatabaseGroup,
  createDatabaseUser,
  expenseInput,
} from '../helpers/databaseFactories';
import { db } from './database';

export { expenseInput };
export const testUser = (name = 'Test User') => createDatabaseUser(db, { name });
export const testGroup = (ownerId: number, memberIds: number[] = []) =>
  createDatabaseGroup(db, ownerId, memberIds);

export const testScenario = async () => {
  const owner = await testUser('Owner');
  const member = await testUser('Member');
  const outsider = await testUser('Outsider');
  const group = await testGroup(owner.id, [member.id]);
  return {
    owner,
    member,
    outsider,
    group,
    input: expenseInput(owner.id, member.id, { groupId: group.id }),
  };
};

export const accountingSnapshot = async () => ({
  expenses: await db.expense.findMany({ orderBy: { id: 'asc' } }),
  participants: await db.expenseParticipant.findMany({
    orderBy: [{ expenseId: 'asc' }, { userId: 'asc' }],
  }),
  balances: await db.balanceView.findMany({
    orderBy: [{ groupId: 'asc' }, { currency: 'asc' }, { userId: 'asc' }, { friendId: 'asc' }],
  }),
});
