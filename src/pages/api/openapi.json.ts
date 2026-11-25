import { type NextApiRequest, type NextApiResponse } from 'next';

import openApiDocument from '~/server/api/openapi.generated.json';

/**
 * Serves the generated OpenAPI 3.1 spec for the public REST API at
 * `GET /api/openapi.json`. The document is generated at build time by
 * `scripts/generate-openapi.ts`.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(openApiDocument);
}
