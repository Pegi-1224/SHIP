import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState, type EmptyStateProps } from './EmptyState';

export interface QueryStateViewProps<TData> {
  query: UseQueryResult<TData, Error>;
  loadingLabel?: string;
  errorTitle?: string;
  /** Return true when the loaded data should render the empty state instead. */
  isEmpty?: (data: TData) => boolean;
  emptyProps?: EmptyStateProps;
  children: (data: TData) => ReactNode;
}

/**
 * Renders the loading / error / empty / success branches of a query in one
 * place, so every page handles all four without copying the same block.
 *
 * Use it when the whole region depends on one query. When a page needs to keep
 * part of the UI visible during an error (a form the user has typed into, for
 * example), handle the branches manually instead - see
 * `features/discussions/pages/NewPostPage.tsx`.
 */
export function QueryStateView<TData>({
  query,
  loadingLabel,
  errorTitle,
  isEmpty,
  emptyProps,
  children,
}: QueryStateViewProps<TData>) {
  if (query.isPending) {
    return <LoadingState label={loadingLabel} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title={errorTitle}
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  if (isEmpty?.(query.data)) {
    return <EmptyState {...emptyProps} />;
  }

  return <>{children(query.data)}</>;
}
