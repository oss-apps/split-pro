import {
  normalizeAmountString,
  parseReceiptItemsResponse,
  parseReceiptResponse,
} from '~/server/api/services/receiptParsers';

const TODAY = new Date().toISOString().split('T')[0]!;

describe('parseReceiptResponse (total mode)', () => {
  it('parses a clean JSON payload', () => {
    const result = parseReceiptResponse(
      '{"amount":"42.50","description":"Acme Store","date":"2025-01-15","category":"food","currency":"EUR"}',
    );
    expect(result).toEqual({
      amount: '42.50',
      description: 'Acme Store',
      date: '2025-01-15',
      category: 'food',
      currency: 'EUR',
    });
  });

  it('strips markdown code fences before parsing', () => {
    const result = parseReceiptResponse(
      '```json\n{"amount":"9.99","description":"Cafe","date":"2025-02-01","category":"food","currency":"USD"}\n```',
    );
    expect(result.amount).toBe('9.99');
    expect(result.description).toBe('Cafe');
  });

  it('extracts the JSON object from a reasoning-model preamble', () => {
    const result = parseReceiptResponse(
      'Let me analyze the receipt.\nThe merchant is Acme Store and the total is 42.50.\n```json\n{"amount":"42.50","description":"Acme Store","date":"2025-01-15","category":"food","currency":"EUR"}\n```',
    );
    expect(result.amount).toBe('42.50');
    expect(result.description).toBe('Acme Store');
    expect(result.currency).toBe('EUR');
  });

  it('falls back to general for an unknown category', () => {
    const result = parseReceiptResponse(
      '{"amount":"1.00","description":"x","date":"2025-01-15","category":"not_a_category","currency":"USD"}',
    );
    expect(result.category).toBe('general');
  });

  it('falls back to USD for an invalid currency', () => {
    const result = parseReceiptResponse(
      '{"amount":"1.00","description":"x","date":"2025-01-15","category":"food","currency":"ZZZ"}',
    );
    expect(result.currency).toBe('USD');
  });

  it('defaults a missing/invalid date to today', () => {
    const result = parseReceiptResponse(
      '{"amount":"1.00","description":"x","date":"not-a-date","category":"food","currency":"USD"}',
    );
    expect(result.date).toBe(TODAY);
  });

  it('defaults a non-numeric amount to "0"', () => {
    const result = parseReceiptResponse(
      '{"amount":"N/A","description":"x","date":"2025-01-15","category":"food","currency":"USD"}',
    );
    expect(result.amount).toBe('0');
  });

  it('throws on invalid JSON (caller surfaces a failed scan)', () => {
    expect(() => parseReceiptResponse('totally not json')).toThrow();
  });
});

describe('parseReceiptItemsResponse (line-items mode)', () => {
  it('parses a list of items', () => {
    const result = parseReceiptItemsResponse(
      '{"items":[{"amount":"4.99","description":"Milk","category":"food"},{"amount":"8.25","description":"Batteries","category":"home"}],"date":"2025-01-15","currency":"USD"}',
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ amount: '4.99', description: 'Milk', category: 'food' });
    expect(result.currency).toBe('USD');
    expect(result.date).toBe('2025-01-15');
  });

  it('extracts the JSON object when surrounded by prose', () => {
    const result = parseReceiptItemsResponse(
      'Here are the items:\n{"items":[{"amount":"3.00","description":"Tea","category":"food"}],"date":"2025-01-15","currency":"USD"}\nThanks!',
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.description).toBe('Tea');
  });

  it('returns an empty list on malformed JSON instead of throwing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = parseReceiptItemsResponse('not json at all');
    expect(result.items).toEqual([]);
    expect(result.currency).toBe('USD');
    expect(result.date).toBe(TODAY);
    spy.mockRestore();
  });

  it('flattens a nested items array', () => {
    const result = parseReceiptItemsResponse(
      '{"items":[[{"amount":"2.00","description":"Gum","category":"food"}]],"date":"2025-01-15","currency":"USD"}',
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.description).toBe('Gum');
  });

  it('drops items with a zero amount or empty description', () => {
    const result = parseReceiptItemsResponse(
      '{"items":[{"amount":"0","description":"Subtotal","category":"food"},{"amount":"5.00","description":"","category":"food"},{"amount":"5.00","description":"Bread","category":"food"}],"date":"2025-01-15","currency":"USD"}',
    );
    expect(result.items).toEqual([{ amount: '5.00', description: 'Bread', category: 'food' }]);
  });

  it('falls back to general for an unknown per-item category', () => {
    const result = parseReceiptItemsResponse(
      '{"items":[{"amount":"5.00","description":"Mystery","category":"weird"}],"date":"2025-01-15","currency":"USD"}',
    );
    expect(result.items[0]?.category).toBe('general');
  });

  it('falls back to USD for an invalid currency', () => {
    const result = parseReceiptItemsResponse(
      '{"items":[{"amount":"5.00","description":"Bread","category":"food"}],"date":"2025-01-15","currency":"ZZZ"}',
    );
    expect(result.currency).toBe('USD');
  });

  it('keeps comma-decimal line items instead of dropping them', () => {
    const result = parseReceiptItemsResponse(
      '{"items":[{"amount":"1,29","description":"Milch","category":"food"},{"amount":"2,49","description":"Brot","category":"food"}],"date":"2026-07-29","currency":"EUR"}',
    );
    expect(result.items).toEqual([
      { amount: '1.29', description: 'Milch', category: 'food' },
      { amount: '2.49', description: 'Brot', category: 'food' },
    ]);
  });
});

describe('normalizeAmountString', () => {
  it('returns already-numeric strings verbatim', () => {
    expect(normalizeAmountString('5.00')).toBe('5.00');
    expect(normalizeAmountString('42.50')).toBe('42.50');
    expect(normalizeAmountString('0')).toBe('0');
  });

  it('converts a comma decimal separator', () => {
    expect(normalizeAmountString('1,29')).toBe('1.29');
    expect(normalizeAmountString('17,55')).toBe('17.55');
  });

  it('resolves mixed separators using the rightmost as the decimal point', () => {
    expect(normalizeAmountString('1.234,56')).toBe('1234.56');
    expect(normalizeAmountString('1,234.56')).toBe('1234.56');
  });

  it('strips grouping separators and currency noise', () => {
    expect(normalizeAmountString('1,234')).toBe('1234');
    expect(normalizeAmountString('€5,99')).toBe('5.99');
    expect(normalizeAmountString('$ 12.50')).toBe('12.50');
    expect(normalizeAmountString('1 234,56')).toBe('1234.56');
  });

  /*
   * "1.234" is ambiguous (1234 grouped, or 1.234 exactly) but Number() accepts it, so it
   * is returned untouched. Treating it as a thousands group would inflate it 1000x,
   * which is far worse than leaving a genuinely-grouped amount slightly low.
   */
  it('leaves a dot-grouped amount alone rather than risk a 1000x error', () => {
    expect(normalizeAmountString('1.234')).toBe('1.234');
  });

  it('returns null for values holding no usable number', () => {
    expect(normalizeAmountString('N/A')).toBeNull();
    expect(normalizeAmountString('')).toBeNull();
    expect(normalizeAmountString('1,2,3')).toBeNull();
    expect(normalizeAmountString(undefined)).toBeNull();
    expect(normalizeAmountString(null)).toBeNull();
  });
});
