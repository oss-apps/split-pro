import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import { db } from '~/server/db';

const DB_CHECK_TIMEOUT_MS = 3000;

/**
 * Readiness check. Verifies the database is reachable, bounded by a short timeout so a
 * hung connection fails the check quickly instead of leaving the request pending. The
 * timeout is enforced by Postgres itself (`statement_timeout`, scoped to this transaction
 * via `SET LOCAL`) rather than raced client-side, so a slow query is actually cancelled
 * instead of left running against the connection pool. Meant for load balancers/
 * orchestrators to stop routing traffic here without restarting the process - see
 * `/api/healthz` for the dependency-free liveness check.
 *
 * This only bounds queries that reach Postgres - it can't help if the socket itself is
 * dead (see the `connect_timeout`/`socket_timeout` note in docs/CONFIGURATION.md), so it's
 * a complement to those connection-string options rather than a replacement for them.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('GET' !== req.method) {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    // DB_CHECK_TIMEOUT_MS is a hardcoded constant, not user input, so inlining it via
    // Prisma.raw is safe here - `SET` does not accept bound query parameters.
    await db.$transaction([
      db.$executeRaw`SET LOCAL statement_timeout = ${Prisma.raw(String(DB_CHECK_TIMEOUT_MS))}`,
      db.$queryRaw`SELECT 1`,
    ]);
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Readiness check failed:', error);
    return res.status(503).json({ status: 'error', message: 'Database not reachable' });
  }
}
