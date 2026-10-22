/**
 * Public surface of the companies feature.
 *
 * Other features import from `@/features/companies`, never from a file inside
 * it. That keeps the internal structure free to change and makes the
 * dependencies between features visible in one place.
 */
export { CompanySearchPage } from './pages/CompanySearchPage';
export { CompanyProfilePage } from './pages/CompanyProfilePage';
export { CompanySubmitPage } from './pages/CompanySubmitPage';
export { NewCompanyPage } from './pages/NewCompanyPage';
export { ComparePage } from './pages/ComparePage';

export { useCompanySearch, useMySubmissions } from './hooks/useCompanies';
export { CompanyPicker } from './components/CompanyPicker';
export { CompanyDemoResults } from './components/CompanyDemoResults';

// Used by tests to arrange company state without driving the UI.
export { createSubmission, fetchCompanyProfile } from './api/companiesApi';
