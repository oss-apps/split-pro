import { parsePrice, parseReceiptItems } from '../lib/receiptParser';

describe('parsePrice', () => {
  it.each([
    ['12.99', 12.99],
    ['$12.00', 12.0],
    ['1,234.56', 1234.56],
    ['1.234,56', 1234.56],
    ['12,99', 12.99],
    ['0.50', 0.5],
    ['€ 9.90', 9.9],
    ['-3.00', -3.0],
    ['1 234,50', 1234.5],
  ])('parses %p as %p', (raw, expected) => {
    expect(parsePrice(raw)).toBe(expected);
  });

  it('returns null for non-numeric input', () => {
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('')).toBeNull();
  });
});

describe('parseReceiptItems', () => {
  it('returns [] for empty input', () => {
    expect(parseReceiptItems('')).toEqual([]);
  });

  it('parses a simple restaurant bill and drops subtotal/tax/tip/total', () => {
    const receipt = [
      "Joe's Diner",
      '123 Main Street',
      'Tel: 555-123-4567',
      '',
      'Carbonara            14.00',
      'Tiramisu              7.50',
      'Sparkling Water       3.00',
      '',
      'Subtotal             24.50',
      'Tax                   2.45',
      'Tip                   4.00',
      'Total                30.95',
      '',
      'Visa ************1234',
      'Thank you for dining with us!',
    ].join('\n');

    expect(parseReceiptItems(receipt)).toEqual([
      { name: 'Carbonara', price: 14.0 },
      { name: 'Tiramisu', price: 7.5 },
      { name: 'Sparkling Water', price: 3.0 },
    ]);
  });

  it('works identically on a grocery receipt (no domain vocabulary)', () => {
    const receipt = [
      'SUPER MART',
      'Bananas 1kg          1.29',
      'Whole Milk           0.99',
      'Cheddar Cheese       4.50',
      'AA Batteries x4      6.99',
      'SUBTOTAL            13.77',
      'VAT                  2.75',
      'TOTAL               16.52',
      'CARD PAYMENT        16.52',
    ].join('\n');

    expect(parseReceiptItems(receipt)).toEqual([
      { name: 'Bananas 1kg', price: 1.29 },
      { name: 'Whole Milk', price: 0.99 },
      { name: 'Cheddar Cheese', price: 4.5 },
      { name: 'AA Batteries x4', price: 6.99 },
    ]);
  });

  it('handles European-formatted prices and currency symbols', () => {
    const receipt = [
      'Café au lait      3,50 €',
      'Croissant         2,20 €',
      'Total            5,70 €',
    ].join('\n');
    expect(parseReceiptItems(receipt)).toEqual([
      { name: 'Café au lait', price: 3.5 },
      { name: 'Croissant', price: 2.2 },
    ]);
  });

  it('ignores lines without a fractional price (quantities, ids, phone numbers)', () => {
    const receipt = [
      'Order #100294',
      'Table 5',
      '2 Coffee',
      'Coffee               4.00',
      '555 8899',
    ].join('\n');
    expect(parseReceiptItems(receipt)).toEqual([{ name: 'Coffee', price: 4.0 }]);
  });

  it('strips price-column alignment dots and leading item numbers', () => {
    const receipt = ['1. Pad Thai .......... 9.95', '2. Spring Rolls ...... 5.00'].join('\n');
    expect(parseReceiptItems(receipt)).toEqual([
      { name: 'Pad Thai', price: 9.95 },
      { name: 'Spring Rolls', price: 5.0 },
    ]);
  });

  it('drops address, url and long card-number noise', () => {
    const receipt = [
      'Widget                5.00',
      '42 Baker Street',
      'www.example.com',
      'Card 4111 1111 1111 1111',
    ].join('\n');
    expect(parseReceiptItems(receipt)).toEqual([{ name: 'Widget', price: 5.0 }]);
  });
});
