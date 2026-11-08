/** Public surface of the discussions feature. */
export { DiscussionsPage } from './pages/DiscussionsPage';
export { NewPostPage } from './pages/NewPostPage';
export { EditPostPage } from './pages/EditPostPage';
export { PostDetailPage } from './pages/PostDetailPage';

export { usePublicPreview } from './hooks/useDiscussions';
export { TagDiscussionColumn } from './components/TagDiscussionColumn';
export { DiscussionPreviewCard } from './components/DiscussionPreviewCard';
export { DiscussionListCard } from './components/DiscussionListCard';

// Used by tests to arrange discussion state without driving the UI.
export {
  createDemoComment,
  createDemoPost,
  createPost,
  markPostRead,
} from './api/discussionsApi';
