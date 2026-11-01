/** @jest-environment jsdom */

import { act, fireEvent, screen } from '@testing-library/react';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import { InfiniteScroll } from './InfiniteScroll';

describe('InfiniteScroll', () => {
  let intersect: IntersectionObserverCallback = () => undefined;
  const disconnect = jest.fn();
  const observe = jest.fn();
  const originalObserver = global.IntersectionObserver;

  beforeEach(() => {
    jest.clearAllMocks();
    global.IntersectionObserver = jest.fn((callback: IntersectionObserverCallback) => {
      intersect = callback;
      return { observe, disconnect };
    }) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    global.IntersectionObserver = originalObserver;
  });

  it('loads once per intersection and disconnects on unmount', () => {
    const load = jest.fn().mockResolvedValue(undefined);
    const { unmount } = renderWithProviders(
      <InfiniteScroll hasNextPage isFetching={false} isError={false} onLoadMore={load} />,
    );
    act(() => {
      const entries = [{ isIntersecting: true }] as IntersectionObserverEntry[];
      intersect(entries, {} as IntersectionObserver);
      intersect(entries, {} as IntersectionObserver);
    });
    expect(load).toHaveBeenCalledTimes(1);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('stops automatic loading after errors and lets the user retry', () => {
    const load = jest.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <InfiniteScroll hasNextPage isFetching={false} isError onLoadMore={load} />,
    );
    expect(observe).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('disables the fallback while fetching and hides it at the end', () => {
    const load = jest.fn();
    const { rerender } = renderWithProviders(
      <InfiniteScroll hasNextPage isFetching isError={false} onLoadMore={load} />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    expect(observe).not.toHaveBeenCalled();
    rerender(
      <InfiniteScroll hasNextPage={false} isFetching={false} isError={false} onLoadMore={load} />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
