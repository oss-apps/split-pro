import { CATEGORIES } from '~/lib/category';
import { isCurrencyCode } from '~/lib/currency';

export interface ReceiptScanResult {
  amount: string;
  description: string;
  date: string;
  category: string;
  currency: string;
}

export interface ReceiptLineItem {
  amount: string;
  description: string;
  category: string;
}

export interface ReceiptItemsScanResult {
  items: ReceiptLineItem[];
  date: string;
  currency: string;
}

const VALID_CATEGORIES = Object.keys(CATEGORIES);

export const RECEIPT_PROMPT = `You are a receipt scanner. Extract the following from the receipt image:
- amount: the total amount as a decimal string (e.g. "42.50"). Use the final total.
- description: the merchant or store name
- date: the date in ISO format "YYYY-MM-DD". Use null if the receipt shows no date —
  never guess a date and never copy the example value below.
- category: one of [${VALID_CATEGORIES.join(', ')}]
- currency: 3-letter ISO currency code (e.g. "USD", "EUR")

Respond with ONLY valid JSON, no markdown fences or extra text:
{"amount":"...","description":"...","date":"...","category":"...","currency":"..."}`;

export const RECEIPT_ITEMS_PROMPT = `Extract line items from this receipt image as JSON.
Exclude tax, tip, subtotal, total, discount, and savings lines.

Output exactly this JSON structure (no other keys):
{"items":[{"amount":"4.99","description":"Organic Milk","category":"food"},{"amount":"8.25","description":"AA Batteries","category":"home"},{"amount":"12.00","description":"Taxi ride","category":"travel"},{"amount":"3.49","description":"Shampoo","category":"life"},{"amount":"15.00","description":"Movie ticket","category":"entertainment"},{"amount":"45.00","description":"Phone bill","category":"utilities"}],"date":"2025-01-15","currency":"USD"}

Field rules:
- "amount": string, numeric only, no currency symbol (e.g. "4.99")
- "description": human-readable item name
- "category": one of [${VALID_CATEGORIES.join(', ')}]
- "date": receipt date as "YYYY-MM-DD". Use null if the receipt shows no date — never
  guess a date and never copy the example value above.
- "currency": 3-letter ISO 4217 code. Use "USD" not "$", "EUR" not "€", "GBP" not "£"`;

const todayIso = (): string => new Date().toISOString().split('T')[0]!;

const stripFences = (text: string): string =>
  text
    .replace(/```(?:json)?\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

/**
 * Coerce a model-supplied amount to a plain decimal string, or null if it holds no
 * usable number.
 *
 * Models regularly ignore the "numeric only" instruction and return locale-formatted
 * amounts — "1,29" on a German receipt, "1.234,56", or "€5,99". `Number()` rejects all
 * of those, which would otherwise turn every line item into "0" and silently drop it,
 * leaving the user with an empty scan. Observed from every provider tested, Gemini
 * included, so it is handled here rather than left to the prompt.
 *
 * Amounts that are already plain-numeric are returned verbatim so "5.00" keeps its
 * trailing zero rather than collapsing to "5".
 */
export const normalizeAmountString = (raw: unknown): string | null => {
  if ('number' === typeof raw) {
    return Number.isFinite(raw) ? String(raw) : null;
  }
  if ('string' !== typeof raw) {
    return null;
  }
  const trimmed = raw.trim();
  if ('' === trimmed) {
    return null;
  }
  if (!isNaN(Number(trimmed))) {
    return trimmed;
  }

  // Drop currency symbols, spaces and any other noise, keeping only digits/separators.
  const kept = trimmed.replace(/[^\d.,-]/g, '');
  const negative = kept.startsWith('-');
  let s = kept.replace(/-/g, '');
  if ('' === s) {
    return null;
  }

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (-1 !== lastComma && -1 !== lastDot) {
    // Both separators present: the rightmost one is the decimal point.
    const cut = Math.max(lastComma, lastDot);
    s = `${s.slice(0, cut).replace(/[.,]/g, '')}.${s.slice(cut + 1).replace(/[.,]/g, '')}`;
  } else if (-1 !== lastComma) {
    // Only commas: digit groups of exactly three mean thousands, otherwise decimal.
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }

  if (!/^\d+(\.\d+)?$/.test(s)) {
    return null;
  }
  return negative ? `-${s}` : s;
};

/**
 * Isolate the JSON object from a model response. Strips markdown fences, then
 * narrows to the outermost `{...}` so reasoning/"thinking" models that wrap the
 * JSON in explanatory prose still parse. Falls back to the fence-stripped text
 * (which JSON.parse will reject) when no object is present.
 */
const extractJsonObject = (text: string): string => {
  const cleaned = stripFences(text);
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
};

/**
 * Parse a single-expense (total mode) model response. Throws if the payload is
 * not valid JSON — callers are expected to surface that as a failed scan.
 */
export function parseReceiptResponse(text: string): ReceiptScanResult {
  const data = JSON.parse(extractJsonObject(text)) as ReceiptScanResult;

  if (!VALID_CATEGORIES.includes(data.category)) {
    data.category = 'general';
  }

  if (!isCurrencyCode(data.currency)) {
    data.currency = 'USD';
  }

  if (!data.date || isNaN(Date.parse(data.date))) {
    data.date = todayIso();
  }

  data.amount = normalizeAmountString(data.amount) ?? '0';

  if (!data.description) {
    data.description = '';
  }

  return data;
}

/**
 * Parse a line-items model response. Unlike the total-mode parser this is
 * tolerant: malformed JSON yields an empty item list rather than throwing.
 */
export function parseReceiptItemsResponse(text: string): ReceiptItemsScanResult {
  let data: ReceiptItemsScanResult;
  try {
    data = JSON.parse(extractJsonObject(text)) as ReceiptItemsScanResult;
  } catch {
    console.error('Failed to parse receipt items response:', text);
    data = { items: [], date: '', currency: '' };
  }

  if (!Array.isArray(data.items)) {
    data.items = [];
  }

  // Flatten if the model returned a nested array [[...]] instead of [...].
  if (data.items.length > 0 && Array.isArray(data.items[0])) {
    data.items = (data.items as unknown as ReceiptLineItem[][]).flat();
  }

  data.items = data.items
    .filter((item) => item && 'object' === typeof item && (item.amount || item.description))
    .map((item) => ({
      amount: normalizeAmountString(item.amount) ?? '0',
      description: item.description || '',
      category: VALID_CATEGORIES.includes(item.category) ? item.category : 'general',
    }))
    .filter((item) => '0' !== item.amount && '' !== item.description);

  if (!isCurrencyCode(data.currency)) {
    data.currency = 'USD';
  }

  if (!data.date || isNaN(Date.parse(data.date))) {
    data.date = todayIso();
  }

  return data;
}
