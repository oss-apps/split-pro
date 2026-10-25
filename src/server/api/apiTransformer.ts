import { type SuperJSONResult, deserialize as superjsonDeserialize } from 'superjson';

/**
 * A superjson envelope is `{ json: …, meta?: … }` and nothing else. Plain JSON
 * payloads (what the public API documents) never match this shape.
 */
const isSuperjsonEnvelope = (data: object): data is SuperJSONResult => {
  if (Array.isArray(data)) {
    return false;
  }

  const keys = Object.keys(data);
  return keys.includes('json') && keys.every((key) => 'json' === key || 'meta' === key);
};

/**
 * Deeply convert a procedure result to plain JSON that matches the generated
 * OpenAPI schemas: `BigInt` → number (monetary values are cents and stay well
 * below `Number.MAX_SAFE_INTEGER`), `Date` → ISO 8601 string.
 */
const toPlainJson = (value: unknown): unknown => {
  if ('bigint' === typeof value) {
    return Number(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(toPlainJson);
  }
  if ('object' === typeof value && null !== value) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toPlainJson(entry)]),
    );
  }

  return value;
};

/**
 * Transformer for the public REST API (`/api/v1`). API consumers send and
 * receive plain JSON:
 *
 * - Input accepts plain JSON (query params, JSON bodies) and additionally
 *   native superjson envelopes, so tRPC clients work against the API too.
 * - Output is serialized to plain JSON instead of a superjson envelope, so
 *   responses match the schemas in the generated OpenAPI document.
 */
export const apiTransformer = {
  input: {
    serialize: (value: unknown) => value,
    deserialize: (data: unknown) => {
      if ('object' !== typeof data || null === data) {
        return data;
      }

      return isSuperjsonEnvelope(data) ? superjsonDeserialize(data) : data;
    },
  },
  output: {
    serialize: (value: unknown) => toPlainJson(value),
    deserialize: (value: unknown) => value,
  },
};
