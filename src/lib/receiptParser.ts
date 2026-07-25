/**
 * Generic receipt line-item parser.
 *
 * This is a deliberately conservative, general-purpose heuristic — it works the same on
 * a grocery receipt as on a restaurant bill and contains NO domain-specific vocabulary
 * (no dish names, no store names). It takes raw OCR text and proposes candidate line
 * items (name + price). It is not guaranteed correct; callers must let the user confirm
 * each suggestion rather than auto-adding anything.
 *
 * Pure functions only, so the logic can be unit-tested in isolation.
 */

export interface ReceiptItem {
  name: string;
  /** Price as a number in major currency units (e.g. 12.99). */
  price: number;
}

/**
 * Lines that are almost never actual purchasable items: totals, taxes, tips, payment
 * and card lines. Matched case-insensitively as whole words against the item name.
 * Kept generic on purpose — these are universal receipt terms, not merchant-specific.
 */
const NOISE_KEYWORDS = [
  'subtotal',
  'sub total',
  'total',
  'balance',
  'amount due',
  'amount paid',
  'amount',
  'tax',
  'vat',
  'gst',
  'hst',
  'pst',
  'tip',
  'gratuity',
  'service charge',
  'service',
  'change',
  'cash',
  'card',
  'credit',
  'debit',
  'visa',
  'mastercard',
  'maestro',
  'amex',
  'discover',
  'payment',
  'paid',
  'tender',
  'tendered',
  'auth',
  'approval',
  'approved',
  'ref',
  'reference',
  'invoice',
  'receipt',
  'order',
  'table',
  'server',
  'cashier',
  'clerk',
  'terminal',
  'merchant',
  'rounding',
  'discount',
  'savings',
  'loyalty',
  'points',
  'thank you',
  'thanks',
  'welcome',
  'have a nice day',
];

/**
 * Footer/header noise that isn't item-shaped even before we look at price:
 * addresses, phone/fax, urls, card/receipt numbers, dates.
 */
const ADDRESS_HINTS = [
  'street',
  'avenue',
  ' ave',
  ' st ',
  ' rd',
  'road',
  'suite',
  'floor',
  'blvd',
  'lane',
  'drive',
  'p.o. box',
  'po box',
];

const URL_OR_CONTACT_RE = /(https?:\/\/|www\.|@|\btel\b|\bfax\b|\bphone\b|\.com\b)/i;

/**
 * A monetary amount with an explicit fractional part, optionally preceded/followed by a
 * currency symbol or 2-3 letter currency code, anchored to the end of the line.
 * Requiring a fractional part is what keeps this conservative: phone numbers, quantities
 * and receipt IDs (which lack a `.dd`/`,dd` tail) are ignored.
 */
const TRAILING_PRICE_RE =
  /([$€£¥₹]\s*)?(-?\d{1,3}(?:[.,\u00A0\u202F ]\d{3})*[.,]\d{2})\s*(?:[$€£¥₹]|[a-zA-Z]{1,3})?\s*$/;

/** A run of 4+ digits that looks like a card/phone/receipt number, not a price. */
const LONG_DIGIT_RUN_RE = /\d[\d ]{9,}\d/;

/**
 * Parse a raw price token (e.g. "1,234.56", "1.234,56", "12,99", "$12.00") into a number.
 * Handles both US ("1,234.56") and European ("1.234,56") groupings by treating the last
 * separator as the decimal point. Returns null when no sensible number can be read.
 */
export function parsePrice(raw: string): number | null {
  const negative = raw.trim().startsWith('-');
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) {
    return null;
  }

  const lastSep = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  const decimals = lastSep === -1 ? 0 : cleaned.length - lastSep - 1;

  let normalized = cleaned;
  if (lastSep !== -1 && (decimals === 1 || decimals === 2)) {
    // Last separator is a decimal point; everything else is a thousands separator.
    const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, '');
    normalized = `${intPart}.${cleaned.slice(lastSep + 1)}`;
  } else if (lastSep !== -1) {
    // Last separator groups thousands; the whole thing is an integer amount.
    normalized = cleaned.replace(/[.,]/g, '');
  }

  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) {
    return null;
  }
  return negative ? -value : value;
}

/** True if the item name is a total/tax/payment/etc. line we should drop. */
function isNoiseName(name: string): boolean {
  const lower = ` ${name.toLowerCase()} `;
  return NOISE_KEYWORDS.some((kw) => lower.includes(` ${kw} `) || lower.includes(`${kw}:`));
}

/** True if the line looks like an address / contact / long ID, not a purchasable item. */
function isStructuralNoise(line: string): boolean {
  const lower = line.toLowerCase();
  if (URL_OR_CONTACT_RE.test(line)) {
    return true;
  }
  if (LONG_DIGIT_RUN_RE.test(line)) {
    return true;
  }
  return ADDRESS_HINTS.some((hint) => lower.includes(hint));
}

/** Parse a single receipt line into an item, or null if it isn't a purchasable item. */
function parseLine(rawLine: string): ReceiptItem | null {
  const line = rawLine.trim();
  if (line.length < 3 || isStructuralNoise(line)) {
    return null;
  }

  const priceMatch = TRAILING_PRICE_RE.exec(line);
  if (!priceMatch) {
    return null;
  }

  const price = parsePrice(priceMatch[2]!);
  if (price === null || price <= 0) {
    return null;
  }

  // Name = text before the price token, minus alignment dots and any leading item number.
  const name = line
    .slice(0, priceMatch.index)
    .trim()
    .replace(/[.\-·•*_\s]+$/g, '')
    .replace(/^\d{1,3}[).]\s+/, '')
    .trim();

  // Require the name to actually contain letters and be plausibly a product name.
  const letterCount = (name.match(/\p{L}/gu) ?? []).length;
  if (letterCount < 2 || name.length > 60 || isNoiseName(name)) {
    return null;
  }

  return { name, price };
}

/**
 * Extract candidate line items from raw OCR text of a receipt.
 * Returns items in the order they appear, filtering out totals, taxes, tips, payment
 * lines and header/footer noise.
 */
export function parseReceiptItems(text: string): ReceiptItem[] {
  if (!text) {
    return [];
  }

  const items: ReceiptItem[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const item = parseLine(rawLine);
    if (item) {
      items.push(item);
    }
  }

  return items;
}
