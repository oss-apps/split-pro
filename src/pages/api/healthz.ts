import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Liveness check. Deliberately does not touch the database (or any other external
 * dependency) - an orchestrator restarting this process would not fix a database
 * outage, and could cause cascading restarts across all replicas at once. See
 * `/api/readyz` for a database-aware check suitable for readiness/traffic routing.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('GET' !== req.method) {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  return res.status(200).json({ status: 'ok' });
}
