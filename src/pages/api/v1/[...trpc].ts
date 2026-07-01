import { createOpenApiNextHandler } from 'trpc-to-openapi';
import { appRouter } from '~/server/api/root';
import { createOpenApiContext } from '~/server/api/trpc';

export default createOpenApiNextHandler({
  router: appRouter,
  createContext: createOpenApiContext,
  onError: ({ path, error }) => {
    if ('development' === process.env.NODE_ENV) {
      console.error(`❌ OpenAPI failed on ${path ?? '<no-path>'}: ${error.message}`);
    }
  },
});
