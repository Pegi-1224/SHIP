import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Anchor, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { ArrowLeft, Scale, Share2 } from 'lucide-react';
import type { MetricAreaId } from '@/shared/types/company';
import { paths } from '@/shared/config/paths';
import { ErrorState, LoadingState, PageHeader } from '@/shared/ui';
import { formatHostname } from '@/shared/utils/format';
import { useCompanyProfile } from '../hooks/useCompanies';
import {
  BenefitsMetric,
  DiversityMetric,
  MaternityMetric,
  PromotionMetric,
  SalaryMetric,
} from '../components/metrics/CompanyMetrics';

/**
 * A single company's profile (spec 3.5).
 *
 * Every metric area renders both provenance branches, and every "Share your
 * data" button opens the submission form already scrolled to that area
 * (spec 6.5).
 */
export function CompanyProfilePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const profileQuery = useCompanyProfile(companyId);

  if (profileQuery.isPending) {
    return <LoadingState label="Loading company…" />;
  }

  if (profileQuery.isError) {
    return (
      <Stack gap="md">
        <BackLink />
        <ErrorState
          error={profileQuery.error}
          title="We could not load this company"
          onRetry={() => void profileQuery.refetch()}
          isRetrying={profileQuery.isFetching}
        />
      </Stack>
    );
  }

  const profile = profileQuery.data;
  const { company } = profile;

  const shareData = (area: MetricAreaId) => {
    navigate(paths.companySubmitArea(company.id, area));
  };

  const metricProps = { profile, onShareData: shareData };

  return (
    <Stack gap="lg">
      <BackLink />

      <PageHeader
        title={company.name}
        description={
          <Group gap="xs" wrap="wrap">
            <Badge variant="light" color="gray">
              {company.industry}
            </Badge>
            <Text span size="sm" c="dimmed">
              {company.headquartersCity}
            </Text>
            <Anchor
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
            >
              {formatHostname(company.website)}
            </Anchor>
          </Group>
        }
        action={
          <Group gap="xs">
            <Button
              variant="light"
              leftSection={<Scale size={16} aria-hidden="true" />}
              onClick={() => navigate(paths.compareCompanies(company.id))}
            >
              Compare
            </Button>
            <Button
              leftSection={<Share2 size={16} aria-hidden="true" />}
              onClick={() => navigate(paths.companySubmit(company.id))}
            >
              Share your data
            </Button>
          </Group>
        }
      />

      {company.isDemoFixture ? (
        <Alert color="ship" variant="light" role="note">
          <Text size="sm">
            <strong>{company.name} is a fictional company.</strong> Its reports, numbers and website
            were invented for this demo and describe no real employer.
          </Text>
        </Alert>
      ) : null}

      <SalaryMetric {...metricProps} />
      <PromotionMetric {...metricProps} />
      <DiversityMetric {...metricProps} />
      <BenefitsMetric {...metricProps} />
      <MaternityMetric {...metricProps} />
    </Stack>
  );
}

function BackLink() {
  return (
    <Anchor component={Link} to={paths.companies()} size="sm">
      <Group gap={4} component="span">
        <ArrowLeft size={14} aria-hidden="true" />
        Back to company search
      </Group>
    </Anchor>
  );
}
