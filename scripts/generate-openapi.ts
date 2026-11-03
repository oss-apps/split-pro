import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { generateOpenAPIDocument } from '@trpc/openapi';
import { format, resolveConfig } from 'prettier';

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
 * `input` and inject the defaults for `limit` (20) and `offset` (0) so the
 * docs UI and generated clients pick them up automatically.
 */
const injectPaginationDefaults = (doc: Awaited<ReturnType<typeof generateOpenAPIDocument>>) => {
  const defaultMap: Record<string, number> = { limit: 20, offset: 0 };

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
