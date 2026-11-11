import { apiTransformer } from '~/server/api/apiTransformer';
import { paginationInput } from '~/utils/pagination';
import { coerceQueryParam, queryParamsToInput } from '~/utils/queryParams';

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

describe('queryParamsToInput', () => {
  it('builds a plain JSON input from individual query params', () => {
    expect(queryParamsToInput(new URLSearchParams('groupId=150&limit=20'))).toEqual({
      groupId: 150,
      limit: 20,
    });
  });

  it('nests bracket keys so cursors can be sent as query params', () => {
    const params = new URLSearchParams(
      'limit=10&cursor[date]=2026-10-25T12:00:00.000Z&cursor[id]=00000000-0000-4000-8000-000000000001',
    );
    expect(queryParamsToInput(params)).toEqual({
      limit: 10,
      cursor: { date: '2026-10-25T12:00:00.000Z', id: '00000000-0000-4000-8000-000000000001' },
    });
  });

  it('skips tRPC reserved params', () => {
    expect(queryParamsToInput(new URLSearchParams('batch=1&trpc=x'))).toEqual({});
  });
});

describe('paginationInput', () => {
  const id = '00000000-0000-4000-8000-000000000001';

  it('accepts the cursor date as an ISO 8601 string from plain-JSON clients', () => {
    const date = new Date('2026-10-25T12:00:00.000Z');
    const cursor = apiTransformer.output.serialize({ date, id });
    expect(paginationInput.parse({ cursor }).cursor).toEqual({ date, id });
  });

  it('still accepts Date cursors from the app', () => {
    const date = new Date();
    expect(paginationInput.parse({ cursor: { date, id } }).cursor).toEqual({ date, id });
  });

  it('rejects cursor dates that are not ISO 8601 date-times', () => {
    expect(paginationInput.safeParse({ cursor: { date: '25.10.2026', id } }).success).toBe(false);
  });
});
