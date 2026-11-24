import { initTRPC } from '@trpc/server';

import { apiTransformer } from './apiTransformer';
import { type InnerTRPCContext, trpcErrorFormatter } from './trpc';

/**
 * Separate tRPC instance for the public API router. It shares the app's
 * context type and error formatter but uses the plain-JSON transformer from
 * `./apiTransformer`.
 *
 * Building the API router from this instance (instead of patching the shared
 * config of the app instance) guarantees that mounting procedures in the API
 * router can never change how `/api/trpc` serializes data — the transformer
 * is resolved from the router each handler mounts, and both `_config` objects
 * stay independent.
 */
const tApi = initTRPC.context<InnerTRPCContext>().create({
  transformer: apiTransformer,
  errorFormatter: trpcErrorFormatter,
});

export const createApiTRPCRouter = tApi.router;
