import type { NextRouter } from 'next/router';

export interface MockRouterOptions {
  pathname?: string;
  asPath?: string;
  query?: NextRouter['query'];
  locale?: string;
}

export const createMockRouter = (options: MockRouterOptions = {}): NextRouter => {
  const router = {
    pathname: options.pathname ?? '/',
    route: options.pathname ?? '/',
    asPath: options.asPath ?? options.pathname ?? '/',
    query: options.query ?? {},
    locale: options.locale ?? 'en',
    locales: ['en'],
    defaultLocale: 'en',
    domainLocales: undefined,
    isReady: true,
    isFallback: false,
    isPreview: false,
    isLocaleDomain: false,
    basePath: '',
    push: jest.fn().mockResolvedValue(true),
    replace: jest.fn().mockResolvedValue(true),
    reload: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  } satisfies NextRouter;

  return router;
};
