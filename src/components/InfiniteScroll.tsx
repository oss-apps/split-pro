import { useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';

import { Button } from '~/components/ui/button';
import { LoadingSpinner } from '~/components/ui/spinner';

interface InfiniteScrollProps {
  hasNextPage: boolean;
  isFetching: boolean;
  isError: boolean;
  onLoadMore: () => Promise<unknown>;
}

// Query-agnostic: pagination, search and filters belong to the caller's query.
// The button also supports keyboard users and browsers without IntersectionObserver.
export const InfiniteScroll = ({
  hasNextPage,
  isFetching,
  isError,
  onLoadMore,
}: InfiniteScrollProps) => {
  const { t } = useTranslation();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasNextPage || isFetching || isError || !('IntersectionObserver' in window)) {
      return undefined;
    }

    let requested = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!requested && entries.some((entry) => entry.isIntersecting)) {
          requested = true;
          void onLoadMore().catch(console.error);
        }
      },
      { root: element.closest('#mainlayout'), rootMargin: '200px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, isError, onLoadMore]);

  if (!hasNextPage && !isError) {
    return null;
  }

  return (
    <div
      ref={sentinel}
      className="flex flex-col items-center gap-2 py-4"
      aria-live="polite"
      aria-busy={isFetching}
    >
      {isError && <p role="alert">{t('pagination.error')}</p>}
      <Button
        variant="ghost"
        disabled={isFetching}
        onClick={() => void onLoadMore().catch(console.error)}
      >
        {isFetching ? (
          <LoadingSpinner aria-label={t('pagination.loading')} />
        ) : (
          t(isError ? 'pagination.retry' : 'pagination.load_more')
        )}
      </Button>
    </div>
  );
};
