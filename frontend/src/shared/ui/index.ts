/**
 * Shared UI surface.
 *
 * Import presentational pieces from here (`@/shared/ui`) rather than reaching
 * into the folder structure, so the internal layout can change without a
 * repo-wide find-and-replace.
 *
 * Mantine primitives (Button, TextInput, Modal, ...) are imported directly
 * from `@mantine/core` wherever they fit. Only components that add SHIP
 * behaviour or SHIP policy live here.
 */

export { LoadingState } from './states/LoadingState';
export type { LoadingStateProps } from './states/LoadingState';
export { EmptyState } from './states/EmptyState';
export type { EmptyStateProps } from './states/EmptyState';
export { ErrorState } from './states/ErrorState';
export type { ErrorStateProps } from './states/ErrorState';
export { QueryStateView } from './states/QueryStateView';

export { ConfirmDialog } from './feedback/ConfirmDialog';
export type { ConfirmDialogProps } from './feedback/ConfirmDialog';
export { SubmitButton } from './feedback/SubmitButton';
export { FormErrorAlert } from './feedback/FormErrorAlert';
export { notifySuccess, notifyError, notifyInfo } from './feedback/notify';

export { SourceLabel } from './data-display/SourceLabel';
export { MetricCard } from './data-display/MetricCard';
export { DataPoint, MissingDataNotice, ThresholdNotice } from './data-display/DataPoint';
export { AnonymousAvatar } from './data-display/AnonymousAvatar';
export { UserAvatar } from './data-display/UserAvatar';
export type { UserAvatarProps } from './data-display/UserAvatar';
export { TagPill } from './data-display/TagPill';
export { CompanyCard } from './data-display/CompanyCard';
export { PostCard } from './data-display/PostCard';

export { SearchInput } from './inputs/SearchInput';
export { TagSelector } from './inputs/TagSelector';

export { BackLink } from './navigation/BackLink';
export type { BackLinkProps } from './navigation/BackLink';

export { PageHeader } from './layout/PageHeader';
export { DemoDataBanner } from './layout/DemoDataBanner';

export { StarterPage } from './starter/StarterPage';
export type { StarterPageProps } from './starter/StarterPage';
export { RelatedLinks } from './starter/RelatedLinks';
export type { RelatedLink } from './starter/RelatedLinks';
