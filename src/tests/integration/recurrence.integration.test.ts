import { env } from '~/env';
import { reconcileRecurrenceSchedules } from '~/server/api/services/recurrenceScheduleService';

import { db } from './database';
import { accountingSnapshot, testScenario } from './factories';
import { callerFor } from './trpc';

describe('recurrence lifecycle', () => {
  it('turns an existing ordinary expense into a recurring template when edited', async () => {
    const { owner, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    await caller.expense.addOrEditExpense({
      ...input,
      expenseId: expense!.id,
      cronExpression: '0 0 1 1 *',
    });
    const saved = await caller.expense.getExpenseDetails({ expenseId: expense!.id });
    expect(saved?.recurrence?.job.schedule).toBe('0 0 1 1 *');
    expect(saved?.recurrence?.job.command).toContain(expense!.id);
    const activity = await caller.expense.getAllExpenses({});
    expect(activity.items.find((item) => item.expenseId === expense!.id)?.expense).toMatchObject({
      recurrenceId: saved?.recurrence?.id,
      updatedBy: owner.id,
    });
    expect(await db.expense.count()).toBe(1);
    expect(await db.expenseRecurrence.count()).toBe(1);
    await caller.expense.deleteExpense({ expenseId: expense!.id });
    expect(await db.expenseRecurrence.count()).toBe(0);
    expect(await db.job.count()).toBe(0);
  });

  it('rolls back the cron job and expense edit when linking the recurrence fails', async () => {
    const { owner, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    const before = await accountingSnapshot();
    await db.$executeRaw`ALTER TABLE "ExpenseRecurrence" ADD CONSTRAINT test_reject_recurrence CHECK (false)`;
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(
        caller.expense.addOrEditExpense({
          ...input,
          expenseId: expense!.id,
          name: 'Must roll back',
          cronExpression: '0 0 1 1 *',
        }),
      ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
      expect(await db.job.count()).toBe(0);
      expect(await db.expenseRecurrence.count()).toBe(0);
      expect(await accountingSnapshot()).toEqual(before);
    } finally {
      await db.$executeRaw`ALTER TABLE "ExpenseRecurrence" DROP CONSTRAINT test_reject_recurrence`;
      log.mockRestore();
    }
  });

  it('duplicates participants and balances, edits the schedule, and stops only when the template is deleted', async () => {
    const { owner, member, input, group } = await testScenario();
    const caller = callerFor(owner.id);
    const [template] = await caller.expense.addOrEditExpense({
      ...input,
      expenseDate: new Date('2000-01-01T12:00:00Z'),
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
      schedule: '0 0 1 1 *',
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
  it('skips a future initial expense and retries only once per calendar day', async () => {
    const { owner, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [template] = await caller.expense.addOrEditExpense({
      ...input,
      expenseDate: new Date('2099-07-01T12:00:00Z'),
      cronExpression: '0 0 L * *',
    });
    const duplicate = () => db.$queryRaw<{ id: string | null }[]>`
      SELECT duplicate_expense_with_participants(${template!.id}::uuid)::text AS id
    `;
    expect((await duplicate())[0]!.id).toBeNull();
    await db.$executeRaw`
      UPDATE "Expense" SET "expenseDate" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
      WHERE id = ${template!.id}::uuid
    `;
    expect((await duplicate())[0]!.id).toBeNull();
    await db.expense.update({
      where: { id: template!.id },
      data: { expenseDate: new Date('2000-01-01T12:00:00Z') },
    });
    const results = await Promise.all([duplicate(), duplicate()]);
    expect(results.flat().filter((result) => null !== result.id)).toHaveLength(1);
    expect((await duplicate())[0]!.id).toBeNull();
    const generated = results.flat().find((result) => null !== result.id)!;
    await caller.expense.deleteExpense({ expenseId: generated.id! });
    expect((await duplicate())[0]!.id).toBeNull();
    const recurrence = await db.expenseRecurrence.findFirstOrThrow({ include: { job: true } });
    expect(recurrence.job.schedule).toBe('0 0 $ * *');
  });
  it('reconciles existing schedules and applies the configured time to new and edited rules', async () => {
    const { owner, input } = await testScenario();
    const caller = callerFor(owner.id);
    await caller.expense.addOrEditExpense({ ...input, cronExpression: '0 0 L * *' });
    const recurrence = await db.expenseRecurrence.findFirstOrThrow();
    await db.$executeRaw`SELECT cron.alter_job(${recurrence.jobId}, active := false)`;
    const [maintenance] = await db.$queryRaw<{ id: bigint }[]>`
      SELECT cron.schedule('test_maintenance', '15 2 * * *', 'SELECT 1') AS id
    `;
    const timeSetting = jest.replaceProperty(env, 'RECURRENCE_TIME', '06:35');
    try {
      expect(await reconcileRecurrenceSchedules()).toBe(1);
      expect(await reconcileRecurrenceSchedules()).toBe(0);
      expect(await db.job.findUnique({ where: { jobid: recurrence.jobId } })).toMatchObject({
        schedule: '35 6 $ * *',
        active: false,
      });
      expect(await db.job.findUnique({ where: { jobid: maintenance!.id } })).toMatchObject({
        schedule: '15 2 * * *',
      });
      await caller.expense.updateRecurrence({
        recurrenceId: recurrence.id,
        cronExpression: '0 0 1 1 *',
      });
      expect(await db.job.findUnique({ where: { jobid: recurrence.jobId } })).toMatchObject({
        schedule: '35 6 1 1 *',
        active: false,
      });
      const [newTemplate] = await caller.expense.addOrEditExpense({
        ...input,
        cronExpression: '0 0 * * 0',
      });
      const newRecurrence = await db.expenseRecurrence.findFirstOrThrow({
        where: { expense: { some: { id: newTemplate!.id } } },
        include: { job: true },
      });
      expect(newRecurrence.job.schedule).toBe('35 6 * * 0');
      const preview = await caller.expense.getRecurrencePreview({ cronExpression: '0 0 L * *' });
      expect(preview).toMatchObject({ timeZone: 'UTC', schedule: '35 6 $ * *' });
      expect(preview.nextRun.getTime()).toBeGreaterThan(Date.now());
    } finally {
      timeSetting.restore();
    }
  });
  it.each(['Pacific/Kiritimati', 'America/Los_Angeles', 'Asia/Kathmandu'])(
    'keeps the instance calendar when the request time zone is %s',
    async (timeZone) => {
      const { owner, input } = await testScenario();
      const caller = callerFor(owner.id, timeZone);
      await caller.expense.addOrEditExpense({ ...input, cronExpression: '0 0 L * *' });
      const recurrence = await db.expenseRecurrence.findFirstOrThrow({ include: { job: true } });
      expect(recurrence.job.schedule).toBe('0 0 $ * *');
      const preview = await caller.expense.getRecurrencePreview({ cronExpression: '0 0 L * *' });
      expect(preview).toMatchObject({ timeZone: 'UTC', schedule: '0 0 $ * *' });
      expect(preview.nextRun.getUTCHours()).toBe(0);
      const lastDay = new Date(
        Date.UTC(preview.nextRun.getUTCFullYear(), preview.nextRun.getUTCMonth() + 1, 0),
      ).getUTCDate();
      expect(preview.nextRun.getUTCDate()).toBe(lastDay);
    },
  );
});
