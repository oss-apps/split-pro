import { db } from './database';
import { testScenario } from './factories';
import { callerFor } from './trpc';

describe('recurrence lifecycle', () => {
  it('duplicates participants and balances, edits the schedule, and stops only when the template is deleted', async () => {
    const { owner, member, input, group } = await testScenario();
    const caller = callerFor(owner.id);
    const [template] = await caller.expense.addOrEditExpense({
      ...input,
      cronExpression: '0 0 1 1 *',
    });
    const recurrence = await db.expenseRecurrence.findFirstOrThrow({ include: { job: true } });
    expect(recurrence.job.schedule).toBe('0 0 1 1 *');
    const [duplicate] = await db.$queryRaw<[{ id: string }]>`
      SELECT duplicate_expense_with_participants(${template!.id}::uuid)::text AS id
    `;
    expect(
      await db.expense.findUnique({
        where: { id: duplicate.id },
        include: { expenseParticipants: true },
      }),
    ).toMatchObject({
      amount: input.amount,
      recurrenceId: recurrence.id,
      expenseParticipants: expect.arrayContaining([
        expect.objectContaining({ userId: owner.id, amount: 1000n }),
        expect.objectContaining({ userId: member.id, amount: -1000n }),
      ]),
    });
    expect(
      await db.balanceView.findFirst({ where: { userId: owner.id, groupId: group.id } }),
    ).toMatchObject({ amount: 2000n });
    await caller.expense.addOrEditExpense({
      ...input,
      expenseId: template!.id,
      cronExpression: '0 12 1 1 *',
    });
    expect(await db.job.findUnique({ where: { jobid: recurrence.jobId } })).toMatchObject({
      schedule: '0 12 1 1 *',
    });
    await caller.expense.deleteExpense({ expenseId: duplicate.id });
    expect(await db.job.count()).toBe(1);
    expect(
      await db.balanceView.findFirst({ where: { userId: owner.id, groupId: group.id } }),
    ).toMatchObject({ amount: 1000n });
    await caller.expense.deleteExpense({ expenseId: template!.id });
    expect(await db.job.count()).toBe(0);
    expect(await db.expenseRecurrence.count()).toBe(0);
  });
});
