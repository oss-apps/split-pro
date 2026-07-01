import { type NextApiRequest, type NextApiResponse } from 'next';
import { generateOpenApiDocument } from 'trpc-to-openapi';

import { appRouter } from '~/server/api/root';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const openApiDocument = generateOpenApiDocument(appRouter, {
    title: 'SplitPro REST API',
    description: 'Official REST API for SplitPro. Authenticate with X-API-Key header.',
    version: '1.0.0',
    baseUrl: `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/v1`,
    tags: ['User', 'Group', 'Expense'],
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
  });

  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(openApiDocument, null, 2));
}
