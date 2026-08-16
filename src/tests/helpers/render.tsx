import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import React from 'react';

import { CurrencyHelpersProvider } from '~/contexts/CurrencyHelpersContext';
import { createTestSession } from './session';

export const englishTranslations: Record<string, string> = {
  'actions.back': 'Back',
  'actions.cancel': 'Cancel',
  'actions.save': 'Save',
  'actions.submit': 'Submit',
  'actors.you': 'You',
  'errors.name_required': 'Name is required',
  'errors.saving_expense': 'Error while saving expense',
  'group_details.create_group.title': 'Create group',
  'group_details.create_group.group_name_placeholder': 'Group name',
  'navigation.account': 'Account',
  'navigation.activity': 'Activity',
  'navigation.add': 'Add',
  'navigation.add_expense': 'Add Expense',
  'navigation.balances': 'Balances',
  'navigation.groups': 'Groups',
  'ui.expense.user.pay': 'pays',
  'ui.expense.you.pay': 'pay',
  'ui.settle_up_name': 'Settlement',
  'ui.select_balance': 'Select balance',
  'meta.application_name': 'SplitPro',
};

const translate = (key: string) => englishTranslations[key] ?? key;

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: translate,
    ready: true,
    i18n: { language: 'en' },
  }),
}));

export interface AppRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: ReturnType<typeof createTestSession> | null;
  queryClient?: QueryClient;
}

export const renderWithProviders = (ui: React.ReactElement, options: AppRenderOptions = {}) => {
  const {
    session = createTestSession(),
    queryClient = new QueryClient(),
    ...renderOptions
  } = options;
  const Wrapper = ({ children }: React.PropsWithChildren) => (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <CurrencyHelpersProvider>
          <ThemeProvider attribute="class" defaultTheme="dark">
            {children}
          </ThemeProvider>
        </CurrencyHelpersProvider>
      </QueryClientProvider>
    </SessionProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};
