import { createNextApiHandler } from '@trpc/server/adapters/next';
import type { NextApiRequest, NextApiResponse } from 'next';

import { env } from '~/env';
import { apiRouter } from '~/server/api/apiRouter';
import { createApiContext } from '~/server/api/apiContext';
import { coerceQueryParam } from '~/utils/queryParams';

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

/**
 * Public REST API handler (API-key auth), mounted at `/api/v1/*`, e.g.
 * `GET /api/v1/user.me`. The wrapper converts individual query params
 * (`?groupId=150&limit=20`) into tRPC's `?input={"groupId":150,"limit":20}`
 * format; the API router's transformer tolerates plain JSON input, so this
 * works for all query procedures including future ones. POST bodies are passed
 * through unchanged (plain JSON or a superjson envelope).
 */
async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  if ('GET' === req.method && req.url) {
    const url = new URL(req.url, 'http://localhost');

    if (!url.searchParams.has('input')) {
      const params: Record<string, unknown> = {};

      url.searchParams.forEach((value, key) => {
        if ('batch' !== key && 'trpc' !== key) {
          params[key] = coerceQueryParam(value);
        }
      });

      if (0 < Object.keys(params).length) {
        url.searchParams.set('input', JSON.stringify(params));
        req.url = url.pathname + url.search;
      }
    }
  }

  await handler(req, res);
}

export default apiHandler;
