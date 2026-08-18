import { type TFunction } from 'next-i18next';
import { toUIDateParts } from '../utils/strings';

// oxlint-disable-next-line no-unsafe-type-assertion -- the util only needs `t` for one key
const tFor = (locale: string) =>
  ((key: string) => ({ res: `today (${key})`, usedLng: locale })) as unknown as TFunction;

const date = new Date(2026, 6, 5, 12);

const supportedLocales = [
  'en',
  'de',
  'fr',
  'it',
  'cs',
  'nl',
  'pl',
  'pt-PT',
  'pt-BR',
  'sv',
  'es',
  'es-MX',
  'es-AR',
  'id',
  'hu',
  'zh-Hant',
];

describe('toUIDateParts', () => {
  it.each([
    ['en', ['Jul', '05']],
    ['de', ['05', 'Jul']],
    ['fr', ['05', 'juil.']],
    ['cs', ['05.', 'čvc']],
    ['pt-BR', ['05', 'jul.']],
    ['pt-PT', ['05', 'jul.']],
    ['es-MX', ['05', 'jul']],
    ['hu', ['júl.', '05']],
    ['zh-Hant', ['7月', '05日']],
  ])('returns the month and the day of %p in locale order', (locale, expected) => {
    expect(toUIDateParts(tFor(locale), date)).toStrictEqual(expected);
  });

  it.each(supportedLocales)('always returns two parts for %p', (locale) => {
    expect(toUIDateParts(tFor(locale), date)).toHaveLength(2);
  });

  it('returns the translated today as a single part', () => {
    expect(toUIDateParts(tFor('pt-BR'), new Date(), { useToday: true })).toStrictEqual([
      'today (ui.today)',
    ]);
  });
});
