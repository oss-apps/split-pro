import '@testing-library/jest-dom';
import { act, cleanup } from '@testing-library/react';

import { clearTestQueryClients } from '../helpers/queryClient';
import { resetStores } from '../helpers/resetStores';

jest.mock('next-i18next', () => ({
  useTranslation: require('~/tests/helpers/i18n').useTestTranslation,
}));

afterEach(() => {
  cleanup();
  clearTestQueryClients();
  act(resetStores);
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query === '(min-width: 768px)',
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(CSSStyleDeclaration.prototype, 'transform', {
  configurable: true,
  value: 'none',
});

HTMLElement.prototype.setPointerCapture = () => undefined;
HTMLElement.prototype.releasePointerCapture = () => undefined;
