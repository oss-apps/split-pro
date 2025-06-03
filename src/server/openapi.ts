import { generateOpenApiDocument } from 'trpc-to-openapi';

import { getBaseUrl } from '~/utils/api';

import { appRouter } from './api/root';

// Generate OpenAPI schema document
export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Split Pro REST API',
  description:
    'This is the OpenAPI schema for the Split Pro REST API. It describes the endpoints, request/response formats, and authentication methods used by the API.',
  version: '1.0.0',
  baseUrl: `${getBaseUrl()}/api`,
  docsUrl: `https://github.com/oss-apps/split-pro`,
  tags: ['auth', 'users', 'expenses', 'groups', 'balances'],
});
