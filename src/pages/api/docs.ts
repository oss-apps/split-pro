import { type NextApiRequest, type NextApiResponse } from 'next';

/**
 * Renders interactive API reference docs (Scalar) for the public REST API at
 * `GET /api/docs`, pointing at `/api/openapi.json`.
 *
 * The Scalar bundle is loaded from jsDelivr pinned to an exact version with a
 * subresource-integrity hash: the script runs on the app origin, so a
 * compromised upstream build must not be able to execute. To upgrade, fetch
 * the pinned file, recompute `sha384` of its bytes (e.g.
 * `openssl dgst -sha384 -binary file | openssl base64 -A`) and update both.
 */
const SCALAR_VERSION = '1.76.0';
const SCALAR_INTEGRITY = 'sha384-oH1C0RwqcwbVXkC+r8A+4qRoyEUQdtxAzOwumkxZtQBBcsy61FOoPt7B50OVJYYQ';

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
    <script
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}"
      integrity="${SCALAR_INTEGRITY}"
      crossorigin="anonymous"
    ></script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
