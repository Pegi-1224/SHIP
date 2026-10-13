/**
 * Seed company-data submissions.
 *
 * The counts are chosen so the demo exercises the privacy threshold in both
 * directions (spec 6.6, AC-6):
 *
 *   northwind-systems   salary 6, promotion 6, diversity 6, benefits 7, maternity 6  -> all visible
 *   lumen-health        salary 5, promotion 5, diversity 5, benefits 6, maternity 5  -> exactly at the threshold
 *   harborline-financial salary 4, diversity 5, benefits 5                            -> salary stays hidden at 4
 *   aster-robotics      salary 6                                                      -> enables the no-public-salary fallback
 *   vireo-consulting    salary 2, benefits 5                                          -> salary hidden
 *   cobalt-grid         diversity 5
 *
 * `northwind-systems` and `aster-robotics` both have five Senior Software
 * Engineer reports, which is what makes a like-for-like user-reported salary
 * comparison possible between them.
 */
import type { SeniorityLevel } from '@/shared/types/common';
import type { SupportProgramId, SubmissionSections, BenefitId } from '@/shared/types/company';
import type { MockSubmission } from '../types';
import { SEED_USERS } from './users';

/** Well before any 90-day window that matters to the signed-in demo user. */
const SEED_SUBMITTED_AT = '2026-06-15T10:00:00.000Z';

interface SeedPlan {
  companyId: string;
  /** Index into SEED_USERS. */
  userIndex: number;
  sections: SubmissionSections;
}

function salary(
  role: string,
  level: SeniorityLevel,
  city: string,
  annualSalaryUsd: number,
): SubmissionSections['salary'] {
  return { role, level, city, annualSalaryUsd };
}

const COMMON_PROGRAMS: SupportProgramId[] = [
  'womens_erg',
  'mentorship_for_women',
  'harassment_reporting_channel',
];

const COMMON_BENEFITS: BenefitId[] = ['health_insurance', 'dental_vision', 'retirement_match'];

const PLANS: SeedPlan[] = [
  /* ---------------- Northwind Systems ---------------- */
  {
    companyId: 'northwind-systems',
    userIndex: 0,
    sections: {
      salary: salary('Software Engineer', 'Senior', 'Seattle, WA', 172_000),
      promotion: { role: 'Software Engineer', fromLevel: 'Mid', toLevel: 'Senior', monthsToPromotion: 22 },
      diversity: {
        teamSize: 12,
        womenOnTeam: 5,
        managerIsWoman: true,
        supportPrograms: [...COMMON_PROGRAMS, 'lactation_room'],
        trustsCompanyResponse: 'yes',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'mental_health_support', 'fertility_support'] },
      maternity: { paidWeeks: 16, payPercent: 100 },
    },
  },
  {
    companyId: 'northwind-systems',
    userIndex: 1,
    sections: {
      salary: salary('Software Engineer', 'Senior', 'Seattle, WA', 165_000),
      promotion: { role: 'Software Engineer', fromLevel: 'Entry', toLevel: 'Mid', monthsToPromotion: 18 },
      diversity: {
        teamSize: 9,
        womenOnTeam: 3,
        managerIsWoman: false,
        supportPrograms: COMMON_PROGRAMS,
        trustsCompanyResponse: 'not_sure',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'flexible_or_remote_work'] },
      maternity: { paidWeeks: 16, payPercent: 100 },
    },
  },
  {
    companyId: 'northwind-systems',
    userIndex: 2,
    sections: {
      salary: salary('Software Engineer', 'Senior', 'Austin, TX', 158_000),
      promotion: { role: 'Product Manager', fromLevel: 'Mid', toLevel: 'Senior', monthsToPromotion: 26 },
      diversity: {
        teamSize: 15,
        womenOnTeam: 7,
        managerIsWoman: true,
        supportPrograms: [...COMMON_PROGRAMS, 'return_to_work_program'],
        trustsCompanyResponse: 'yes',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'tuition_or_learning_budget'] },
      maternity: { paidWeeks: 16, payPercent: 100 },
    },
  },
  {
    companyId: 'northwind-systems',
    userIndex: 3,
    sections: {
      salary: salary('Software Engineer', 'Senior', 'Seattle, WA', 176_000),
      promotion: { role: 'Software Engineer', fromLevel: 'Senior', toLevel: 'Manager', monthsToPromotion: 30 },
      diversity: {
        teamSize: 8,
        womenOnTeam: 2,
        managerIsWoman: false,
        supportPrograms: ['harassment_reporting_channel', 'flexible_or_remote_work'],
        trustsCompanyResponse: 'no',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'mental_health_support'] },
      maternity: { paidWeeks: 16, payPercent: 100 },
    },
  },
  {
    companyId: 'northwind-systems',
    userIndex: 4,
    sections: {
      salary: salary('Software Engineer', 'Senior', 'Seattle, WA', 169_000),
      promotion: { role: 'Designer', fromLevel: 'Mid', toLevel: 'Senior', monthsToPromotion: 20 },
      diversity: {
        teamSize: 11,
        womenOnTeam: 6,
        managerIsWoman: true,
        supportPrograms: [...COMMON_PROGRAMS, 'lactation_room', 'flexible_or_remote_work'],
        trustsCompanyResponse: 'yes',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'fertility_support', 'flexible_or_remote_work'] },
      maternity: { paidWeeks: 16, payPercent: 100 },
    },
  },
  {
    companyId: 'northwind-systems',
    userIndex: 5,
    sections: {
      salary: salary('Product Manager', 'Manager', 'New York, NY', 195_000),
      promotion: { role: 'Program Manager', fromLevel: 'Senior', toLevel: 'Manager', monthsToPromotion: 24 },
      diversity: {
        teamSize: 10,
        womenOnTeam: 4,
        managerIsWoman: true,
        supportPrograms: COMMON_PROGRAMS,
        trustsCompanyResponse: 'yes',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'commuter_benefit'] },
      maternity: { paidWeeks: 16, payPercent: 100 },
    },
  },
  {
    // Benefits-only submission: shows that a user may fill one section.
    companyId: 'northwind-systems',
    userIndex: 6,
    sections: {
      benefits: { benefits: [...COMMON_BENEFITS, 'paid_parental_leave_beyond_maternity'] },
    },
  },

  /* ---------------- Lumen Health ---------------- */
  {
    companyId: 'lumen-health',
    userIndex: 1,
    sections: {
      salary: salary('Nurse Practitioner', 'Senior', 'Boston, MA', 146_000),
      promotion: { role: 'Nurse Practitioner', fromLevel: 'Mid', toLevel: 'Senior', monthsToPromotion: 28 },
      diversity: {
        teamSize: 20,
        womenOnTeam: 15,
        managerIsWoman: true,
        supportPrograms: [...COMMON_PROGRAMS, 'lactation_room', 'return_to_work_program'],
        trustsCompanyResponse: 'yes',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'childcare_stipend'] },
      maternity: { paidWeeks: 20, payPercent: 100 },
    },
  },
  {
    companyId: 'lumen-health',
    userIndex: 2,
    sections: {
      salary: salary('Nurse Practitioner', 'Senior', 'Boston, MA', 139_000),
      promotion: { role: 'Nurse Practitioner', fromLevel: 'Entry', toLevel: 'Mid', monthsToPromotion: 16 },
      diversity: {
        teamSize: 18,
        womenOnTeam: 11,
        managerIsWoman: true,
        supportPrograms: [...COMMON_PROGRAMS, 'return_to_work_program'],
        trustsCompanyResponse: 'yes',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'mental_health_support'] },
      maternity: { paidWeeks: 20, payPercent: 100 },
    },
  },
  {
    companyId: 'lumen-health',
    userIndex: 7,
    sections: {
      salary: salary('Data Scientist', 'Mid', 'Boston, MA', 128_000),
      promotion: { role: 'Data Scientist', fromLevel: 'Entry', toLevel: 'Mid', monthsToPromotion: 19 },
      diversity: {
        teamSize: 7,
        womenOnTeam: 4,
        managerIsWoman: false,
        supportPrograms: ['harassment_reporting_channel', 'flexible_or_remote_work'],
        trustsCompanyResponse: 'not_sure',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'commuter_benefit'] },
      maternity: { paidWeeks: 20, payPercent: 100 },
    },
  },
  {
    companyId: 'lumen-health',
    userIndex: 8,
    sections: {
      salary: salary('Nurse Practitioner', 'Mid', 'Boston, MA', 121_500),
      promotion: { role: 'Nurse Practitioner', fromLevel: 'Mid', toLevel: 'Senior', monthsToPromotion: 31 },
      diversity: {
        // Zero team size: must be excluded from the women-share median rather
        // than counted as 0%.
        teamSize: 0,
        womenOnTeam: 0,
        managerIsWoman: true,
        supportPrograms: COMMON_PROGRAMS,
        trustsCompanyResponse: 'yes',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'childcare_stipend'] },
      maternity: { paidWeeks: 20, payPercent: 100 },
    },
  },
  {
    companyId: 'lumen-health',
    userIndex: 9,
    sections: {
      salary: salary('Program Manager', 'Senior', 'Boston, MA', 152_000),
      promotion: { role: 'Program Manager', fromLevel: 'Mid', toLevel: 'Senior', monthsToPromotion: 23 },
      diversity: {
        teamSize: 14,
        womenOnTeam: 9,
        managerIsWoman: true,
        supportPrograms: [...COMMON_PROGRAMS, 'lactation_room'],
        trustsCompanyResponse: 'yes',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'paid_parental_leave_beyond_maternity'] },
      maternity: { paidWeeks: 20, payPercent: 100 },
    },
  },
  {
    companyId: 'lumen-health',
    userIndex: 10,
    sections: {
      benefits: { benefits: [...COMMON_BENEFITS, 'fertility_support'] },
    },
  },

  /* ---------------- Harborline Financial ---------------- */
  // Four salary reports only: the aggregate must stay hidden until a fifth
  // person submits, which the demo walkthrough does by hand.
  {
    companyId: 'harborline-financial',
    userIndex: 3,
    sections: {
      salary: salary('Financial Analyst', 'Senior', 'New York, NY', 178_000),
      diversity: {
        teamSize: 16,
        womenOnTeam: 5,
        managerIsWoman: false,
        supportPrograms: ['harassment_reporting_channel'],
        trustsCompanyResponse: 'no',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'commuter_benefit'] },
    },
  },
  {
    companyId: 'harborline-financial',
    userIndex: 4,
    sections: {
      salary: salary('Financial Analyst', 'Senior', 'New York, NY', 186_000),
      diversity: {
        teamSize: 22,
        womenOnTeam: 7,
        managerIsWoman: false,
        supportPrograms: ['harassment_reporting_channel', 'mentorship_for_women'],
        trustsCompanyResponse: 'not_sure',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'tuition_or_learning_budget'] },
    },
  },
  {
    companyId: 'harborline-financial',
    userIndex: 5,
    sections: {
      salary: salary('Financial Analyst', 'Mid', 'New York, NY', 142_000),
      diversity: {
        teamSize: 11,
        womenOnTeam: 3,
        managerIsWoman: true,
        supportPrograms: COMMON_PROGRAMS,
        trustsCompanyResponse: 'yes',
      },
      benefits: { benefits: COMMON_BENEFITS },
    },
  },
  {
    companyId: 'harborline-financial',
    userIndex: 11,
    sections: {
      salary: salary('Consultant', 'Senior', 'New York, NY', 171_000),
      diversity: {
        teamSize: 9,
        womenOnTeam: 2,
        managerIsWoman: false,
        supportPrograms: ['harassment_reporting_channel'],
        trustsCompanyResponse: 'no',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'commuter_benefit'] },
    },
  },
  {
    companyId: 'harborline-financial',
    userIndex: 12,
    sections: {
      diversity: {
        teamSize: 13,
        womenOnTeam: 6,
        managerIsWoman: true,
        supportPrograms: [...COMMON_PROGRAMS, 'flexible_or_remote_work'],
        trustsCompanyResponse: 'not_sure',
      },
      benefits: { benefits: [...COMMON_BENEFITS, 'mental_health_support'] },
    },
  },

  /* ---------------- Aster Robotics ---------------- */
  // No public salary, but five Senior Software Engineer reports, so a
  // like-for-like comparison against Northwind is possible.
  {
    companyId: 'aster-robotics',
    userIndex: 0,
    sections: { salary: salary('Software Engineer', 'Senior', 'Austin, TX', 151_000) },
  },
  {
    companyId: 'aster-robotics',
    userIndex: 6,
    sections: { salary: salary('Software Engineer', 'Senior', 'Austin, TX', 147_500) },
  },
  {
    companyId: 'aster-robotics',
    userIndex: 7,
    sections: { salary: salary('Software Engineer', 'Senior', 'Austin, TX', 156_000) },
  },
  {
    companyId: 'aster-robotics',
    userIndex: 8,
    sections: { salary: salary('Software Engineer', 'Senior', 'Austin, TX', 143_000) },
  },
  {
    companyId: 'aster-robotics',
    userIndex: 9,
    sections: { salary: salary('Software Engineer', 'Senior', 'Austin, TX', 149_500) },
  },
  {
    companyId: 'aster-robotics',
    userIndex: 13,
    sections: { salary: salary('Designer', 'Mid', 'Austin, TX', 118_000) },
  },

  /* ---------------- Vireo Consulting ---------------- */
  {
    companyId: 'vireo-consulting',
    userIndex: 2,
    sections: {
      salary: salary('Consultant', 'Senior', 'Chicago, IL', 161_000),
      benefits: { benefits: [...COMMON_BENEFITS, 'flexible_or_remote_work'] },
    },
  },
  {
    companyId: 'vireo-consulting',
    userIndex: 10,
    sections: {
      salary: salary('Consultant', 'Mid', 'Chicago, IL', 132_000),
      benefits: { benefits: [...COMMON_BENEFITS, 'mental_health_support'] },
    },
  },
  {
    companyId: 'vireo-consulting',
    userIndex: 11,
    sections: { benefits: { benefits: COMMON_BENEFITS } },
  },
  {
    companyId: 'vireo-consulting',
    userIndex: 12,
    sections: { benefits: { benefits: [...COMMON_BENEFITS, 'tuition_or_learning_budget'] } },
  },
  {
    companyId: 'vireo-consulting',
    userIndex: 13,
    sections: { benefits: { benefits: [...COMMON_BENEFITS, 'flexible_or_remote_work'] } },
  },

  /* ---------------- Cobalt Grid Energy ---------------- */
  {
    companyId: 'cobalt-grid',
    userIndex: 0,
    sections: {
      diversity: {
        teamSize: 25,
        womenOnTeam: 5,
        managerIsWoman: false,
        supportPrograms: ['harassment_reporting_channel'],
        trustsCompanyResponse: 'not_sure',
      },
    },
  },
  {
    companyId: 'cobalt-grid',
    userIndex: 3,
    sections: {
      diversity: {
        teamSize: 18,
        womenOnTeam: 4,
        managerIsWoman: false,
        supportPrograms: ['harassment_reporting_channel', 'flexible_or_remote_work'],
        trustsCompanyResponse: 'no',
      },
    },
  },
  {
    companyId: 'cobalt-grid',
    userIndex: 7,
    sections: {
      diversity: {
        teamSize: 30,
        womenOnTeam: 9,
        managerIsWoman: true,
        supportPrograms: COMMON_PROGRAMS,
        trustsCompanyResponse: 'yes',
      },
    },
  },
  {
    companyId: 'cobalt-grid',
    userIndex: 9,
    sections: {
      diversity: {
        teamSize: 12,
        womenOnTeam: 2,
        managerIsWoman: false,
        supportPrograms: ['harassment_reporting_channel'],
        trustsCompanyResponse: 'not_sure',
      },
    },
  },
  {
    companyId: 'cobalt-grid',
    userIndex: 13,
    sections: {
      diversity: {
        teamSize: 16,
        womenOnTeam: 6,
        managerIsWoman: true,
        supportPrograms: [...COMMON_PROGRAMS, 'lactation_room'],
        trustsCompanyResponse: 'yes',
      },
    },
  },
];

export function buildSeedSubmissions(): MockSubmission[] {
  return PLANS.map((plan, index) => {
    const user = SEED_USERS[plan.userIndex];
    if (!user) throw new Error(`Seed plan ${index} references a missing user`);

    const submittedAt = new Date(
      new Date(SEED_SUBMITTED_AT).getTime() + index * 3_600_000,
    ).toISOString();

    return {
      id: `sub_seed_${index + 1}`,
      companyId: plan.companyId,
      userId: user.id,
      sections: plan.sections,
      createdAt: submittedAt,
      updatedAt: submittedAt,
      supersededAt: null,
    };
  });
}
