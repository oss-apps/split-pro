import { type NextApiRequest, type NextApiResponse } from 'next';

/**
 * Renders interactive API reference docs (Scalar) for the public REST API at
 * `GET /api/docs`, pointing at `/api/openapi.json`.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const html = `<!doctype html>
<html>
  <head>
    <title>SplitPro API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
