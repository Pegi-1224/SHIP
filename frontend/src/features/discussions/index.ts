/** Public surface of the discussions feature. */
export { DiscussionsPage } from './pages/DiscussionsPage';
export { NewPostPage } from './pages/NewPostPage';
export { EditPostPage } from './pages/EditPostPage';
export { PostDetailPage } from './pages/PostDetailPage';

export { usePublicPreview } from './hooks/useDiscussions';

// Used by tests to arrange discussion state without driving the UI.
export { createPost, markPostRead } from './api/discussionsApi';
