import { QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import type { Session } from 'next-auth';
import { SessionContext } from 'next-auth/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import type { NextRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';
import React from 'react';

import { CurrencyHelpersProvider } from '~/contexts/CurrencyHelpersContext';
import { createTestQueryClient } from './queryClient';
import { createMockRouter } from './router';
import { createMockSession, createTestSession } from './session';

export interface AppRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null;
  sessionLoading?: boolean;
  router?: NextRouter;
}

export const renderWithProviders = (ui: React.ReactElement, options: AppRenderOptions = {}) => {
  const {
    session = createTestSession(),
    sessionLoading = false,
    router = createMockRouter(),
    ...renderOptions
  } = options;
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: React.PropsWithChildren) => (
    <RouterContext.Provider value={router}>
      <SessionContext.Provider value={createMockSession(session, sessionLoading)}>
        <QueryClientProvider client={queryClient}>
          <CurrencyHelpersProvider>
            <ThemeProvider attribute="class" defaultTheme="dark">
              {children}
            </ThemeProvider>
          </CurrencyHelpersProvider>
        </QueryClientProvider>
      </SessionContext.Provider>
    </RouterContext.Provider>
  );
  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), router, queryClient };
};
