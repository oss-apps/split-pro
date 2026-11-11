import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { generateOpenAPIDocument } from '@trpc/openapi';
import { format, resolveConfig } from 'prettier';

import { paginationInput } from '../src/utils/pagination';

/**
 * Generates the OpenAPI spec for the public API from `apiRouter`.
 *
 * `@trpc/openapi` statically analyses the router's TypeScript types (it never
 * runs the code), so this is a build-time step — the result is committed to
 * `openapi.generated.json` and served at `/api/openapi.json`. The pre-push
 * hook and `pnpm build` regenerate it, keeping the committed file in sync.
 *
 * Run with: `pnpm gen:openapi` (sets SKIP_ENV_VALIDATION so no app secrets
 * are required to typecheck the router).
 */

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routerPath = path.join(rootDir, 'src/server/api/apiRouter.ts');
const outputPath = path.join(rootDir, 'src/server/api/openapi.generated.json');

/**
 * Relative server URL: the spec is served from the same origin as the API
 * (`/api/openapi.json`), so self-hosted deployments get a working "Try it"
 * button in the docs regardless of their host.
 */
const SERVER_URL = '/api/v1';

type OpenAPIDocument = Awaited<ReturnType<typeof generateOpenAPIDocument>>;

/** Minimal shape of a query parameter object we post-process below. */
interface QueryParameterObject {
  name?: unknown;
  content?: Record<string, { schema?: { properties?: Record<string, { default?: unknown }> } }>;
}

const isQueryParameterObject = (value: unknown): value is QueryParameterObject =>
  'object' === typeof value && null !== value && 'name' in value;

/** Minimal shape of an operation object we post-process below. */
interface OperationObject {
  parameters?: unknown;
}

const isOperationObject = (value: unknown): value is OperationObject =>
  'object' === typeof value && null !== value && 'parameters' in value;

/**
 * The generator infers Zod `.default()` as optional fields but does not emit
 * the actual default values into the schema. Walk every query parameter named
 * `input` and inject the default `limit` of the shared pagination schema so
 * the docs UI and generated clients pick it up automatically.
 */
const injectPaginationDefaults = (doc: OpenAPIDocument) => {
  const defaultMap: Record<string, number> = { limit: paginationInput.parse({}).limit };

  for (const pathItem of Object.values(doc.paths ?? {})) {
    for (const operation of Object.values(pathItem ?? {})) {
      if (!isOperationObject(operation) || !Array.isArray(operation.parameters)) {
        continue;
      }

      for (const parameter of operation.parameters) {
        if (!isQueryParameterObject(parameter) || 'input' !== parameter.name) {
          continue;
        }
        const props = parameter.content?.['application/json']?.schema?.properties;
        if (!props) {
          continue;
        }

        for (const [field, defaultValue] of Object.entries(defaultMap)) {
          const prop = props[field];
          if (undefined !== prop && undefined === prop.default) {
            prop.default = defaultValue;
          }
        }
      }
    }
  }
};

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object' as const,
        properties: { error: { type: 'string' as const } },
        required: ['error'],
      },
    },
  },
});

/**
 * Receipt upload is a plain Next.js route (`src/pages/api/v1/upload.ts`), not a
 * tRPC procedure, so the generator cannot see it. Document it by hand.
 */
const addUploadPath = (doc: OpenAPIDocument) => {
  doc.paths ??= {};
  doc.paths['/upload'] = {
    post: {
      operationId: 'upload',
      tags: ['upload'],
      summary: 'Upload a receipt image',
      description:
        'Upload an image as `multipart/form-data` in the `file` field. It is converted to WebP ' +
        'and stored for the authenticated user. Pass the returned `key` as `fileKey` to ' +
        '`expense.addOrEditExpense` to attach it to an expense.',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: { file: { type: 'string', format: 'binary' } },
              required: ['file'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Stored file key',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { key: { type: 'string', examples: ['1/0d9c…-….webp'] } },
                required: ['key'],
              },
            },
          },
        },
        '400': errorResponse('No file provided'),
        '401': errorResponse('Missing, unknown or expired API key'),
        '405': errorResponse('Method not allowed'),
        '500': errorResponse('Upload failed, e.g. file too large or not an image'),
      },
    },
  };
};

async function main() {
  const doc = await generateOpenAPIDocument(routerPath, {
    exportName: 'apiRouter',
    title: 'SplitPro API',
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    servers: [{ url: SERVER_URL }],
  });

  // The generator infers paths/schemas but not auth, so we declare bearer
  // API-key auth globally (also drives the docs UI's "Authorize" button).
  doc.components ??= {};
  doc.components.securitySchemes = {
    ...doc.components.securitySchemes,
    bearerAuth: { type: 'http', scheme: 'bearer', description: 'SplitPro API key (spro_…)' },
  };
  doc.security = [{ bearerAuth: [] }];

  injectPaginationDefaults(doc);
  addUploadPath(doc);

  // Format the output with the project's prettier config so the generated file
  // Is byte-identical to what the pre-commit hook produces.
  const prettierConfig = await resolveConfig(outputPath);
  const spec = await format(JSON.stringify(doc), { ...prettierConfig, parser: 'json' });

  await writeFile(outputPath, spec);
  console.log(
    `✓ Wrote OpenAPI spec (${Object.keys(doc.paths ?? {}).length} paths) to ${outputPath}`,
  );
}

main().catch((error) => {
  console.error('Failed to generate OpenAPI spec:', error);
  process.exit(1);
});
