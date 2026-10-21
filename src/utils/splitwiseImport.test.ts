import { parseSplitwiseImport } from './splitwiseImport';

const validUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  first_name: 'Ada',
  last_name: null,
  email: 'ada@example.com',
  balance: [{ currency_code: 'USD', amount: '900719925474099312345.6789' }],
  picture: { small: '', medium: '', large: '' },
  registration_status: 'confirmed',
  ...overrides,
});

describe('parseSplitwiseImport', () => {
  it('keeps eligible records, ignores unconfirmed/empty records, and accepts extra fields', () => {
    const preview = parseSplitwiseImport({
      friends: [
        validUser({ ignored_extra_field: true }),
        validUser({ registration_status: 'invited' }),
        validUser({ balance: [] }),
      ],
      groups: [
        { id: 2, name: 'Trip', members: [validUser()], extra: 'allowed' },
        { id: 0, name: 'placeholder', members: [null] },
        { id: 3, name: 'empty', members: [] },
      ],
    });

    expect(preview.usersWithBalance).toHaveLength(1);
    expect(preview.usersWithBalance[0]?.balance[0]?.amount).toBe('900719925474099312345.6789');
    expect(preview.groups.map(({ id }) => id)).toEqual([2]);
  });

  it.each([
    null,
    [],
    {},
    { friends: [], groups: {} },
    { friends: [null], groups: [] },
    { friends: [validUser({ email: 'invalid' })], groups: [] },
    { friends: [], groups: [{ id: 2, name: 'Bad', members: [validUser({ email: 'invalid' })] }] },
  ])('rejects malformed eligible envelope or nested records', (input) => {
    expect(() => parseSplitwiseImport(input)).toThrow();
  });

  it('does not require full user details for records excluded from import', () => {
    expect(
      parseSplitwiseImport({
        friends: [
          { registration_status: 'invited' },
          { registration_status: 'confirmed', balance: [] },
        ],
        groups: [
          { id: 0, members: [null] },
          { id: 2, members: [] },
        ],
      }),
    ).toEqual({ usersWithBalance: [], groups: [] });
  });

  it.each(['-0.99', '001.2300', '0.00000000000000000001'])(
    'preserves monetary strings exactly: %s',
    (amount) => {
      const preview = parseSplitwiseImport({
        friends: [validUser({ balance: [{ currency_code: 'USD', amount }] })],
        groups: [],
      });

      expect(preview.usersWithBalance[0]?.balance[0]?.amount).toBe(amount);
    },
  );

  it('rejects numeric amounts instead of coercing financial data', () => {
    expect(() =>
      parseSplitwiseImport({
        friends: [validUser({ balance: [{ currency_code: 'USD', amount: 1.25 }] })],
        groups: [],
      }),
    ).toThrow();
  });
});
