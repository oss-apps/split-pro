import type { NextApiRequest, NextApiResponse } from 'next';

import { parseApiKeyFromHeaders, resolveApiKeyUser } from '~/server/api/apiKey';
import { db } from '~/server/db';
import { handleUpload } from '~/server/upload';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Public API receipt upload (`POST /api/v1/upload`, API-key auth). Takes
 * precedence over the `[trpc]` catch-all, which only serves tRPC procedures.
 * Documented by hand in `scripts/generate-openapi.ts`.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('POST' !== req.method) {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolved = await resolveApiKeyUser(db, parseApiKeyFromHeaders(req.headers));
  if (!resolved) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return handleUpload(req, res, resolved.user.id);
}
