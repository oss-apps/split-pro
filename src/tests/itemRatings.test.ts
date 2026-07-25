import { ITEM_RATINGS_NOTE_HEADER, formatItemRatingsNote, starsFor } from '../lib/itemRatings';

describe('starsFor', () => {
  it.each([
    [1, '★☆☆☆☆'],
    [4, '★★★★☆'],
    [5, '★★★★★'],
    [0, '☆☆☆☆☆'],
    [7, '★★★★★'],
  ])('renders %p as %p', (rating, expected) => {
    expect(starsFor(rating)).toBe(expected);
  });
});

describe('formatItemRatingsNote', () => {
  it('formats items into a note body', () => {
    expect(
      formatItemRatingsNote([
        { name: 'Carbonara', rating: 4 },
        { name: 'Tiramisu', rating: 5 },
      ]),
    ).toBe(
      [ITEM_RATINGS_NOTE_HEADER, '- Carbonara ★★★★☆ (4/5)', '- Tiramisu ★★★★★ (5/5)'].join('\n'),
    );
  });

  it('trims names and drops unrated / out-of-range items', () => {
    expect(
      formatItemRatingsNote([
        { name: '  Coffee  ', rating: 3 },
        { name: 'No stars', rating: 0 },
        { name: '', rating: 5 },
      ]),
    ).toBe([ITEM_RATINGS_NOTE_HEADER, '- Coffee ★★★☆☆ (3/5)'].join('\n'));
  });

  it('returns null when nothing valid is present', () => {
    expect(formatItemRatingsNote([])).toBeNull();
    expect(formatItemRatingsNote([{ name: 'x', rating: 0 }])).toBeNull();
  });
});
