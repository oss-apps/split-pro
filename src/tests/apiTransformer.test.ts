import { apiTransformer } from '~/server/api/apiTransformer';
import { paginatedResult, paginationInput } from '~/server/api/pagination';
import { coerceQueryParam } from '~/utils/queryParams';

describe('apiTransformer', () => {
  describe('input.deserialize', () => {
    it('passes plain JSON objects through unchanged', () => {
      expect(apiTransformer.input.deserialize({ groupId: 150 })).toEqual({ groupId: 150 });
    });

    it('passes plain JSON arrays through unchanged', () => {
      expect(apiTransformer.input.deserialize([{ json: 1 }])).toEqual([{ json: 1 }]);
    });

    it('passes primitives and null through unchanged', () => {
      expect(apiTransformer.input.deserialize(null)).toBeNull();
      expect(apiTransformer.input.deserialize('{"a":1}')).toBe('{"a":1}');
      expect(apiTransformer.input.deserialize(42)).toBe(42);
    });

    it('unwraps superjson envelopes, reviving special types', () => {
      const envelope = { json: { amount: '1000' }, meta: { values: { amount: ['bigint'] } } };
      expect(apiTransformer.input.deserialize(envelope)).toEqual({ amount: 1000n });
    });

    it('does not treat objects with extra keys as envelopes', () => {
      const plain = { json: 1, meta: 2, other: 3 };
      expect(apiTransformer.input.deserialize(plain)).toBe(plain);
    });
  });

  describe('output.serialize', () => {
    it('converts BigInt to number and Date to ISO string', () => {
      const at = new Date('2026-01-01T12:00:00.000Z');
      expect(apiTransformer.output.serialize({ amount: 1234n, at, name: 'lunch' })).toEqual({
        amount: 1234,
        at: '2026-01-01T12:00:00.000Z',
        name: 'lunch',
      });
    });

    it('walks nested objects and arrays', () => {
      const at = new Date('2026-01-01T12:00:00.000Z');
      expect(
        apiTransformer.output.serialize({
          items: [{ amount: -5n, nested: { at } }],
          empty: null,
        }),
      ).toEqual({
        items: [{ amount: -5, nested: { at: '2026-01-01T12:00:00.000Z' } }],
        empty: null,
      });
    });

    it('is JSON.stringify-safe for monetary payloads', () => {
      const serialized = apiTransformer.output.serialize({ total: 9999999999n });
      expect(() => JSON.stringify(serialized)).not.toThrow();
      expect(serialized).toEqual({ total: 9999999999 });
    });

    it('returns BigInt beyond MAX_SAFE_INTEGER as a string to preserve precision', () => {
      const unsafe = 9007199254740993n; // Number.MAX_SAFE_INTEGER + 2
      expect(apiTransformer.output.serialize({ total: unsafe })).toEqual({
        total: '9007199254740993',
      });
      const serialized = apiTransformer.output.serialize({ total: unsafe }) as { total: unknown };
      expect(typeof serialized.total).toBe('string');
    });
  });
});

describe('coerceQueryParam', () => {
  it('coerces booleans', () => {
    expect(coerceQueryParam('true')).toBe(true);
    expect(coerceQueryParam('false')).toBe(false);
  });

  it('coerces canonical number strings', () => {
    expect(coerceQueryParam('150')).toBe(150);
    expect(coerceQueryParam('-3')).toBe(-3);
    expect(coerceQueryParam('1.5')).toBe(1.5);
  });

  it('leaves non-canonical values as strings', () => {
    expect(coerceQueryParam('01')).toBe('01');
    expect(coerceQueryParam('1e3')).toBe('1e3');
    expect(coerceQueryParam('true-ish')).toBe('true-ish');
    expect(coerceQueryParam('')).toBe('');
  });

  it('turns numeric-looking and boolean-looking query strings into their JSON types, which can fail zod string schemas', () => {
    // ?name=123 becomes name: 123 (number), which would fail a z.string() schema.
    expect(coerceQueryParam('123')).toBe(123);
    expect(typeof coerceQueryParam('123')).toBe('number');
    // ?name=true becomes name: true (boolean), which would fail a z.string() schema.
    expect(coerceQueryParam('true')).toBe(true);
    expect(typeof coerceQueryParam('true')).toBe('boolean');
  });
});

describe('paginationInput', () => {
  it('applies defaults for missing values', () => {
    expect(paginationInput.parse({})).toEqual({ limit: 20, offset: 0 });
    expect(paginationInput.default({}).parse(undefined)).toEqual({ limit: 20, offset: 0 });
  });

  it('rejects fractional and out-of-range values', () => {
    expect(paginationInput.safeParse({ limit: 1.5 }).success).toBe(false);
    expect(paginationInput.safeParse({ limit: 0 }).success).toBe(false);
    expect(paginationInput.safeParse({ limit: 101 }).success).toBe(false);
    expect(paginationInput.safeParse({ offset: -1 }).success).toBe(false);
  });
});

describe('paginatedResult', () => {
  it('wraps items with pagination metadata', () => {
    const page = [1, 2, 3];
    expect(paginatedResult(page, 10, { limit: 3, offset: 0 })).toEqual({
      items: page,
      pagination: { total: 10, limit: 3, offset: 0, hasMore: true },
    });
  });

  it('marks the last page', () => {
    expect(paginatedResult([9, 10], 10, { limit: 5, offset: 8 }).pagination.hasMore).toBe(false);
  });
});
