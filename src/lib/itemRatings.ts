/**
 * Item ratings are rendered as plain text into an ExpenseNote (reusing the existing
 * note model — no new table). Kept generic: "items" work the same for a grocery
 * receipt as a restaurant bill. These are pure helpers so they can be unit-tested.
 */

export interface RatedItem {
  name: string;
  /** 1-5. Items outside this range (or unrated) are dropped when formatting. */
  rating: number;
}

/**
 * The literal header written into the note. Kept as a stable constant (not an i18n
 * lookup) so stored note text never depends on the viewer's language.
 */
export const ITEM_RATINGS_NOTE_HEADER = 'Item ratings:';

const FILLED_STAR = '★';
const EMPTY_STAR = '☆';

/** Render "★★★★☆" for a 1-5 rating. */
export function starsFor(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return FILLED_STAR.repeat(clamped) + EMPTY_STAR.repeat(5 - clamped);
}

/**
 * Format rated items into a note body, e.g.:
 *   Item ratings:
 *   - Carbonara ★★★★☆ (4/5)
 *   - Tiramisu ★★★★★ (5/5)
 * Returns null when there is nothing valid to save.
 */
export function formatItemRatingsNote(items: RatedItem[]): string | null {
  const lines = items
    .filter((item) => item.name.trim().length > 0 && item.rating >= 1 && item.rating <= 5)
    .map((item) => `- ${item.name.trim()} ${starsFor(item.rating)} (${item.rating}/5)`);

  if (lines.length === 0) {
    return null;
  }

  return [ITEM_RATINGS_NOTE_HEADER, ...lines].join('\n');
}
