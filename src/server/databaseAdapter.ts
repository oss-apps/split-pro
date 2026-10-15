import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7 delegates connections to pg, which does not interpret Prisma's URL options.
// Keep existing deployment URLs and explicit connection limits working for every client.
export const createDatabaseAdapter = (connectionString: string) => {
  // Next.js imports server modules while building without database credentials.
  // Like Prisma 6, defer connection-string validation until the first connection.
  const parameters = URL.parse(connectionString)?.searchParams ?? new URLSearchParams();
  const seconds = (name: string, fallback: number) =>
    Number(parameters.get(name) ?? fallback) * 1_000;
  const connectionLimit = parameters.get('connection_limit');

  return new PrismaPg(
    {
      connectionString,
      ...(connectionLimit ? { max: Number(connectionLimit) } : {}),
      connectionTimeoutMillis: seconds('connect_timeout', 5),
      idleTimeoutMillis: seconds('max_idle_connection_lifetime', 300),
      maxLifetimeSeconds: Number(parameters.get('max_connection_lifetime') ?? 0),
      ...(parameters.has('socket_timeout')
        ? { statement_timeout: seconds('socket_timeout', 0) }
        : {}),
    },
    { schema: parameters.get('schema') ?? 'public' },
  );
};
