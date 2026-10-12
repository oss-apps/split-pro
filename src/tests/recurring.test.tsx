/** @jest-environment node */

import { renderToStaticMarkup } from 'react-dom/server';
import type { User } from 'next-auth';

import RecurringPage from '~/pages/recurring';

const user: User = {
  id: 1,
  name: 'Marco',
  email: 'marco@example.com',
  image: '',
  currency: 'EUR',
  preferredLanguage: 'en',
  hiddenFriendIds: [],
};

const mockRecurrences = ['EUR', 'JPY', 'KWD'].map((currency, id) => ({
  id,
  job: { schedule: '0 0 * * *' },
  expense: {
    id: String(id),
    name: currency,
    currency,
    amount: 2000n,
    expenseDate: new Date('2026-10-12T00:00:00Z'),
    addedByUser: { id: 1, name: 'Marco' },
  },
}));

jest.mock('~/utils/api', () => ({
  api: {
    expense: {
      getRecurringExpenses: { useQuery: () => ({ data: mockRecurrences, isPending: false }) },
      deleteRecurrence: { useMutation: () => ({ isPending: false }) },
    },
    useUtils: () => ({ expense: { getRecurringExpenses: {} } }),
  },
}));
jest.mock('~/hooks/useTranslationWithUtils', () => ({
  useTranslationWithUtils: () => ({
    t: (key: string, values?: { name: string; amount: string; currency: string }) =>
      values ? `${values.name}: ${values.amount.trim()} ${values.currency}` : key,
    toUIDate: () => '12 October',
    getCurrencyHelpersCached: (currency: string) =>
      jest.requireActual('~/utils/numbers').getCurrencyHelpers({ locale: 'en', currency }),
  }),
}));
jest.mock('~/hooks/useIntlCronParser', () => ({
  useIntlCronParser: () => ({ cronParser: () => '', i18nReady: false }),
}));
jest.mock('~/components/Layout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('~/components/Expense/EditRecurrenceDialog', () => ({
  EditRecurrenceDialog: () => null,
}));
jest.mock('~/components/SimpleConfirmationDialog', () => ({
  SimpleConfirmationDialog: () => null,
}));
jest.mock('~/components/ui/avatar', () => ({ EntityAvatar: () => null }));
jest.mock('~/utils/i18n/server', () => ({ withI18nStaticProps: () => () => ({ props: {} }) }));

describe('RecurringPage currencies', () => {
  it('formats every row in its own currency when decimal places differ', () => {
    const html = renderToStaticMarkup(<RecurringPage user={user} />);

    expect(html).toContain('EUR: 20 €');
    expect(html).toContain('JPY: 2,000 ¥');
    expect(html).toContain('KWD: 2 KWD');
    expect(html).not.toContain('JPY: 20 ¥');
    expect(html).not.toContain('KWD: 20 KWD');
  });
});
