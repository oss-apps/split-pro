/** @jest-environment jsdom */

import { act } from '@testing-library/react';
import { type Root, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { useIsClient } from '~/hooks/useIsClient';
import { useIsPwa } from '~/hooks/useIsPwa';

describe('React compiler hydration and PWA subscription regressions', () => {
  it('keeps the client hook false for the server snapshot and true on the client', () => {
    const ClientStatus = () => <span>{useIsClient() ? 'client' : 'server'}</span>;
    const markup = renderToString(<ClientStatus />);
    expect(markup).toBe('<span>server</span>');

    const container = document.createElement('div');
    container.innerHTML = markup;
    document.body.append(container);
    let root: Root | null = null;
    act(() => {
      root = hydrateRoot(container, <ClientStatus />);
    });
    expect(container.textContent).toBe('client');
    act(() => root?.unmount());
    container.remove();
  });

  it('updates PWA status on display-mode changes and unsubscribes on unmount', () => {
    const originalMatchMedia = window.matchMedia;
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const mediaQueryList: MediaQueryList = {
      media: '(display-mode: standalone)',
      onchange: null,
      get matches() {
        return matches;
      },
      addEventListener: (_type: string, callback: EventListenerOrEventListenerObject) => {
        listeners.add(callback);
      },
      removeEventListener: (_type: string, callback: EventListenerOrEventListenerObject) => {
        listeners.delete(callback);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    };
    let matches = false;
    window.matchMedia = (query) =>
      query === mediaQueryList.media ? mediaQueryList : originalMatchMedia(query);

    const ClientPwaStatus = () => <span>{useIsPwa() ? 'pwa' : 'browser'}</span>;
    const markup = renderToString(<ClientPwaStatus />);
    const container = document.createElement('div');
    container.innerHTML = markup;
    document.body.append(container);
    let root: Root | null = null;
    act(() => {
      root = hydrateRoot(container, <ClientPwaStatus />);
    });
    expect(container.textContent).toBe('browser');

    act(() => {
      matches = true;
      listeners.forEach((callback) => {
        if ('function' === typeof callback) {
          callback(new Event('change'));
        } else {
          callback.handleEvent(new Event('change'));
        }
      });
    });
    expect(container.textContent).toBe('pwa');

    act(() => root?.unmount());
    expect(listeners.size).toBe(0);
    window.matchMedia = originalMatchMedia;
    container.remove();
  });
});
