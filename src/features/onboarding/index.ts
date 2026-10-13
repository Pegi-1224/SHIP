/** Public surface of the onboarding feature. */
export { AssessmentPage } from './pages/AssessmentPage';
export { InstructionWalkthrough } from './components/InstructionWalkthrough';
export { useDevCompleteAssessment } from './hooks/useAssessment';

// Used by tests to put an account into the "assessment finished" state.
export { saveAssessment } from './api/assessmentApi';
