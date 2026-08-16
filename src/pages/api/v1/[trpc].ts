import { createNextApiHandler } from '@trpc/server/adapters/next';
import type { NextApiRequest, NextApiResponse } from 'next';

import { env } from '~/env';
import { apiRouter } from '~/server/api/apiRouter';
import { createApiContext } from '~/server/api/apiContext';

const handler = createNextApiHandler({
  router: apiRouter,
  createContext: createApiContext,
  onError:
    'development' === env.NODE_ENV
      ? ({ path, error }) => {
          console.error(`❌ API failed on ${path ?? '<no-path>'}: ${error.message}`);
        }
      : undefined,
});

const isPlainValue = (v: string): string | number | boolean => {
  if ('true' === v) {
    return true;
  }
  if ('false' === v) {
    return false;
  }
  const n = Number(v);
  if (!Number.isNaN(n) && String(n) === v) {
    return n;
  }

  return v;
};

/**
 * Public REST API handler (API-key auth), mounted at `/api/v1/*`, e.g.
 * `GET /api/v1/user.me`. The wrapper converts individual query params
 * (`?groupId=150`) into tRPC's `?input={"groupId":150}` format, coercing
 * values to numbers/booleans where obvious. The API router's transformer is
 * configured to tolerate plain JSON input, so this works for all query
 * procedures including future ones.
 */
export default async (req: NextApiRequest, res: NextApiResponse) => {
  if ('GET' === req.method && req.url) {
    const url = new URL(req.url, 'http://localhost');

    if (!url.searchParams.has('input')) {
      const params: Record<string, unknown> = {};

      url.searchParams.forEach((value, key) => {
        if ('batch' !== key && 'trpc' !== key) {
          params[key] = isPlainValue(value);
        }
      });

      if (0 < Object.keys(params).length) {
        url.searchParams.set('input', JSON.stringify(params));
        req.url = url.pathname + url.search;
      }
    }
  }

  await handler(req, res);
};
