export const isStringQueryParam = (value: unknown): value is string => 'string' === typeof value;

/**
 * Coerce a query-param string to a plain JSON value: booleans and canonical
 * number strings become their JSON types, everything else stays a string.
 * Used by the public API handler to bridge individual query params into tRPC's
 * JSON `?input=` format.
 */
export const coerceQueryParam = (value: string): string | number | boolean => {
  if ('true' === value) {
    return true;
  }
  if ('false' === value) {
    return false;
  }
  const n = Number(value);
  if (!Number.isNaN(n) && String(n) === value) {
    return n;
  }

  return value;
};

const NESTED_KEY = /^([^[\]]+)\[([^[\]]+)\]$/;
const RESERVED_KEYS = new Set(['batch', 'trpc']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  'object' === typeof value && null !== value && !Array.isArray(value);

/**
 * Convert individual query params into a plain JSON input object for the public
 * API. One level of bracket nesting (`cursor[date]=…&cursor[id]=…`) becomes a
 * nested object, so object inputs such as pagination cursors can be sent too.
 */
export const queryParamsToInput = (searchParams: URLSearchParams): Record<string, unknown> => {
  const input: Record<string, unknown> = {};

  searchParams.forEach((value, key) => {
    if (RESERVED_KEYS.has(key)) {
      return;
    }

    const nested = NESTED_KEY.exec(key);
    if (!nested) {
      input[key] = coerceQueryParam(value);
      return;
    }

    const [, parent = '', child = ''] = nested;
    const existing = input[parent];
    input[parent] = { ...(isRecord(existing) ? existing : {}), [child]: coerceQueryParam(value) };
  });

  return input;
};
