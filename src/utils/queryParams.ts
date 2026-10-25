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
