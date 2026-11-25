import { sendPushNotificationToUsers } from '~/server/api/services/notificationService';

import { db } from './database';
import { testScenario } from './factories';
import { callerFor } from './trpc';

const delivery = jest.mocked(sendPushNotificationToUsers);

describe('expense comments', () => {
  it('creates an initial comment atomically without a separate notification and preserves it on edits', async () => {
    const { owner, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense({
      ...input,
      initialComment: '  Dinner details  ',
    });
    const details = await caller.expense.getExpenseDetails({ expenseId: expense!.id });
    expect(details!.expenseNotes).toEqual([
      expect.objectContaining({ note: 'Dinner details', createdById: owner.id }),
    ]);
    expect(delivery).not.toHaveBeenCalled();
    await caller.expense.addOrEditExpense({
      ...input,
      expenseId: expense!.id,
      initialComment: 'Should not be added on edit',
    });
    expect(await db.expenseNote.count({ where: { expenseId: expense!.id } })).toBe(1);
  });

  it('notifies only other expense participants, even when an uninvolved group member comments', async () => {
    const { owner, member, outsider, group, input } = await testScenario();
    await db.groupUser.create({ data: { groupId: group.id, userId: outsider.id } });
    const [expense] = await callerFor(owner.id).expense.addOrEditExpense(input);
    // Details adds missing group members for editing. This must not affect notification recipients.
    await callerFor(owner.id).expense.getExpenseDetails({ expenseId: expense!.id });
    await callerFor(owner.id).expense.addComment({ expenseId: expense!.id, note: 'Hello' });
    expect(delivery).toHaveBeenLastCalledWith(
      [member.id],
      expect.objectContaining({ data: { url: `/expenses/${expense!.id}` } }),
    );
    await callerFor(outsider.id).expense.addComment({ expenseId: expense!.id, note: 'Question' });
    expect(delivery).toHaveBeenLastCalledWith(
      expect.arrayContaining([owner.id, member.id]),
      expect.anything(),
    );
    expect(delivery.mock.calls.at(-1)![0]).toHaveLength(2);
  });

  it('restricts edits and deletion to the author and scopes comment ids to their expense', async () => {
    const { owner, member, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense, other] = await caller.expense.addOrEditExpense([input, input]);
    const comment = await caller.expense.addComment({ expenseId: expense!.id, note: 'Original' });
    const target = { expenseId: expense!.id, commentId: comment.id };
    await expect(
      callerFor(member.id).expense.editComment({ ...target, note: 'Changed' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(callerFor(member.id).expense.deleteComment(target)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(
      caller.expense.deleteComment({ ...target, expenseId: other!.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    delivery.mockClear();
    await caller.expense.editComment({ ...target, note: ' Revised ' });
    expect(await db.expenseNote.findUnique({ where: { id: comment.id } })).toMatchObject({
      note: 'Revised',
    });
    await caller.expense.deleteComment(target);
    expect(await db.expenseNote.findUnique({ where: { id: comment.id } })).toBeNull();
    expect(delivery).not.toHaveBeenCalled();
  });

  it('includes a payer whose net balance is zero in notifications and comment access', async () => {
    const { owner, member, input } = await testScenario();
    const [expense] = await callerFor(owner.id).expense.addOrEditExpense({
      ...input,
      groupId: null,
      paidBy: member.id,
      participants: [{ userId: owner.id, amount: 0n }],
    });
    await callerFor(owner.id).expense.addComment({ expenseId: expense!.id, note: 'Receipt' });
    expect(delivery).toHaveBeenLastCalledWith([member.id], expect.anything());
    const payer = callerFor(member.id);
    expect(await payer.expense.getExpenseDetails({ expenseId: expense!.id })).toBeTruthy();
    await expect(
      payer.expense.addComment({ expenseId: expense!.id, note: 'Thanks' }),
    ).resolves.toMatchObject({ createdById: member.id });
  });

  it('preserves long comments while keeping their notification preview within push payload limits', async () => {
    const { owner, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    const note = '🍕'.repeat(2500);
    const comment = await caller.expense.addComment({ expenseId: expense!.id, note });
    expect(comment.note).toBe(note);
    expect(Buffer.byteLength(JSON.stringify(delivery.mock.calls.at(-1)![1]))).toBeLessThan(4096);
  });

  it('rejects anonymous users, outsiders, empty and oversized comments, and comments on deleted expenses', async () => {
    const { owner, outsider, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    const target = { expenseId: expense!.id, note: 'Hello' };
    await expect(callerFor(null).expense.addComment(target)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    await expect(callerFor(outsider.id).expense.addComment(target)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(caller.expense.addComment({ ...target, note: '  ' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(
      caller.expense.addComment({ ...target, note: 'a'.repeat(5001) }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await caller.expense.deleteExpense({ expenseId: expense!.id });
    await expect(caller.expense.addComment(target)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(delivery).not.toHaveBeenCalled();
  });
});
