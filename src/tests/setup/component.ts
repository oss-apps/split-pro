import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
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
