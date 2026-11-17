import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { parseApiKeyFromHeaders, resolveApiKeyUser } from '~/server/api/apiKey';
import { authOptions } from '~/server/auth';
import { db } from '~/server/db';
import { handleUpload } from '~/server/upload';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Receipt upload (`POST /api/v1/upload`). Takes precedence over the `[trpc]`
 * catch-all, which only serves tRPC procedures. Documented by hand in
 * `scripts/generate-openapi.ts`. API clients authenticate via `X-API-Key` or a
 * bearer key; the app's own upload UI holds no key, so its cookie session is
 * accepted as a fallback.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('POST' !== req.method) {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolved = await resolveApiKeyUser(db, parseApiKeyFromHeaders(req.headers));
  const user = resolved?.user ?? (await getServerSession(req, res, authOptions))?.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return handleUpload(req, res, user.id);
}
