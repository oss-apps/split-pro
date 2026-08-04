import { parseEnvBoolean } from '../utils/env';

describe('parseEnvBoolean', () => {
  it.each([
    ['1', true],
    ['true', true],
    ['TRUE', true],
    ['  TrUe  ', true],
    ['0', false],
    ['false', false],
    ['FALSE', false],
    ['  FaLsE  ', false],
  ])('parses %p as %p', (value, expected) => {
    expect(parseEnvBoolean(value)).toBe(expected);
  });

  it.each([undefined, '', 'on', 'off', 'yes', '2'])('uses false for invalid value %p', (value) => {
    expect(parseEnvBoolean(value)).toBe(false);
  });

  it.each([undefined, '', 'on', 'off', 'yes', '2'])(
    'uses the supplied fallback for invalid value %p',
    (value) => {
      expect(parseEnvBoolean(value, true)).toBe(true);
    },
  );
});
