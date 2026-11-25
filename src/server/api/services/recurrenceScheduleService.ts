import cronParser from 'cron-parser';

import { env } from '~/env';
import { cronToBackend } from '~/lib/cron';
import { db } from '~/server/db';

/** Apply the operator's execution time in cron.timezone, preserving calendar fields. */
export const getRecurrenceSchedule = (expression: string): string => {
  const [hour, minute] = env.RECURRENCE_TIME.split(':').map(Number);
  const calendar = cronToBackend(expression).split(' ').slice(2).join(' ');
  return `${minute} ${hour} ${calendar}`;
};

/** Resolve a concrete instant so browser display includes date shifts and DST. */
export const getNextRecurrenceDate = (
  schedule: string,
  timeZone: string,
  currentDate = new Date(),
): Date =>
  cronParser
    .parseExpression(schedule.replaceAll('$', 'L'), { tz: timeZone, currentDate })
    .next()
    .toDate();

/** Reconcile on every startup, including when only runtime configuration changes. */
export const reconcileRecurrenceSchedules = async (): Promise<number> =>
  db.$transaction(async (tx) => {
    // Lock jobs so concurrent application instances observe the latest schedules.
    const jobs = await tx.$queryRaw<{ jobid: bigint; schedule: string }[]>`
      SELECT j.jobid, j.schedule FROM cron.job j
      JOIN "ExpenseRecurrence" r ON r."jobId" = j.jobid
      ORDER BY j.jobid FOR UPDATE OF j
    `;
    const changes = jobs
      .map((job) => ({
        jobid: job.jobid,
        schedule: job.schedule,
        desired: getRecurrenceSchedule(job.schedule),
      }))
      .filter((job) => job.schedule !== job.desired);

    await Promise.all(
      changes.map(
        (job) => tx.$executeRaw`SELECT cron.alter_job(${job.jobid}, schedule := ${job.desired})`,
      ),
    );
    return changes.length;
  });
