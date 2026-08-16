import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { generateOpenAPIDocument } from '@trpc/openapi';

// Static spec generation needs only router types; env validation is disabled here so build/CI can run without app secrets.
process.env.SKIP_ENV_VALIDATION ||= 'true';

/**
 * Generates the OpenAPI spec for the public REST API from `apiRouter`.
 *
 * `@trpc/openapi` statically analyses the router's TypeScript types (it never
 * runs the code), so this is a build-time step — the result is committed/emitted
 * to `openapi.generated.json` and served at `/api/openapi.json`.
 *
 * Run with: `pnpm gen:openapi`
 */

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routerPath = path.join(rootDir, 'src/server/api/apiRouter.ts');
const outputPath = path.join(rootDir, 'src/server/api/openapi.generated.json');

const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

async function main() {
  const doc = await generateOpenAPIDocument(routerPath, {
    exportName: 'apiRouter',
    title: 'SplitPro API',
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    servers: [{ url: `${baseUrl}/api/v1` }],
  });

  // The generator infers paths/schemas but not auth, so we declare bearer
  // API-key auth globally (also drives Scalar's "Authorize" button).
  doc.components = doc.components ?? {};
  doc.components.securitySchemes = {
    ...doc.components.securitySchemes,
    bearerAuth: { type: 'http', scheme: 'bearer', description: 'SplitPro API key (spro_…)' },
  };
  doc.security = [{ bearerAuth: [] }];

  // `@trpc/openapi`'s static analyzer infers Zod `.default()` as optional fields
  // But doesn't emit the actual default values into the schema. Walk every query
  // Parameter named "input" and inject defaults for `limit` (20) and `offset` (0)
  // So the Scalar UI and generated clients pick them up automatically.
  const defaultMap: Record<string, number> = { limit: 20, offset: 0 };
  // Biome-ignore lint/suspicious/noExplicitAny: post-processing untyped OpenAPI JSON
  const paths: any = doc.paths ?? {};

  for (const op of Object.values(paths)) {
    for (const operation of Object.values(op as Record<string, unknown>)) {
      // Biome-ignore lint/suspicious/noExplicitAny: post-processing untyped OpenAPI JSON
      const o: any = operation;
      if (!Array.isArray(o.parameters)) {
        continue;
      }

      for (const param of o.parameters as unknown[]) {
        // Biome-ignore lint/suspicious/noExplicitAny: post-processing untyped OpenAPI JSON
        const p: any = param;
        if ('input' !== p.name) {
          continue;
        }
        const props = p.content?.['application/json']?.schema?.properties;
        if (!props) {
          continue;
        }

        for (const [field, defaultValue] of Object.entries(defaultMap)) {
          if (field in props && undefined === props[field].default) {
            props[field].default = defaultValue;
          }
        }
      }
    }
  }

  await writeFile(outputPath, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(
    `✓ Wrote OpenAPI spec (${Object.keys(doc.paths ?? {}).length} paths) to ${outputPath}`,
  );
}

main().catch((error) => {
  console.error('Failed to generate OpenAPI spec:', error);
  process.exit(1);
});
