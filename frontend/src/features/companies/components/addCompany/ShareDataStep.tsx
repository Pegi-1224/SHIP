import type { FormEvent, ReactNode } from 'react';
import { Baby, Gift, TrendingUp, Users } from 'lucide-react';
import {
  LEAVE_DURATION_OPTIONS,
  PARENTAL_SUPPORT_OPTIONS,
  PROMOTION_CYCLE_OPTIONS,
  PROMOTION_SUPPORT_OPTIONS,
  PROMOTION_TIME_OPTIONS,
  ROLE_OPTIONS,
  US_STATE_OPTIONS,
  WELFARE_BENEFIT_OPTIONS,
  WOMEN_SUPPORT_OPTIONS,
} from '@/shared/config/formOptions';
import { SENIORITY_LEVELS } from '@/shared/types/common';
import type { NewCompanyFieldErrors } from '@/shared/utils/newCompany';
import {
  CheckboxGroup,
  DataSection,
  SelectField,
  TextField,
  YesNoField,
  YesNoNotSureField,
} from './controls';
import type { DataDraft } from './draft';
import styles from './AddCompany.module.css';

const PROMOTION_TIMES = PROMOTION_TIME_OPTIONS.map((option) => option.label);
const LEAVE_DURATIONS = LEAVE_DURATION_OPTIONS.map((option) => option.label);
const OPTIONAL_NUMBER = 'Number, or N/A';

export interface ShareDataStepProps {
  draft: DataDraft;
  onChange: <K extends keyof DataDraft>(section: K, patch: Partial<DataDraft[K]>) => void;
  errors: NewCompanyFieldErrors;
  /** Shown above the buttons: sign-in prompt or a failed save. */
  notice: ReactNode;
  isPending: boolean;
  canSave: boolean;
  onBack: () => void;
  onSave: () => void;
}

/**
 * Step 2: salary, women support & diversity, promotion, benefits and paid
 * maternity leave. The last three can be skipped; team size, women on team
 * and the other optional numbers take "N/A".
 */
export function ShareDataStep({
  draft,
  onChange,
  errors,
  notice,
  isPending,
  canSave,
  onBack,
  onSave,
}: ShareDataStepProps) {
  const { salary, womenSupport, promotion, benefits, maternity } = draft;
  const error = (field: string) => errors[field]?.[0];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPending) onSave();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.sections}>
      <DataSection
        title="Salary"
        icon={<span className={styles.dollar}>$</span>}
        iconClassName={styles.iconSalary}
      >
        <div className={styles.row}>
          <SelectField
            label="Role"
            value={salary.role}
            options={ROLE_OPTIONS}
            onChange={(role) => onChange('salary', { role })}
            error={error('salary.role')}
          />
          <SelectField
            label="Level"
            value={salary.level}
            options={SENIORITY_LEVELS}
            onChange={(level) => onChange('salary', { level })}
            error={error('salary.level')}
          />
        </div>
        <div className={styles.row}>
          <SelectField
            label="State"
            value={salary.state}
            options={US_STATE_OPTIONS}
            onChange={(state) => onChange('salary', { state })}
            error={error('salary.state')}
          />
          <TextField
            label="Annual salary (USD)"
            inputMode="numeric"
            value={salary.annualSalaryUsd}
            onChange={(annualSalaryUsd) => onChange('salary', { annualSalaryUsd })}
            placeholder="e.g. 95000"
            error={error('salary.annualSalaryUsd')}
          />
        </div>
      </DataSection>

      <DataSection
        title="Women support & diversity"
        icon={<Users size={18} strokeWidth={1.8} absoluteStrokeWidth />}
        iconClassName={styles.iconDiversity}
      >
        <div className={styles.row}>
          <TextField
            label="Team size"
            inputMode="numeric"
            value={womenSupport.teamSize}
            onChange={(teamSize) => onChange('womenSupport', { teamSize })}
            placeholder={OPTIONAL_NUMBER}
            error={error('womenSupport.teamSize')}
          />
          <TextField
            label="Women on team"
            inputMode="numeric"
            value={womenSupport.womenOnTeam}
            onChange={(womenOnTeam) => onChange('womenSupport', { womenOnTeam })}
            placeholder={OPTIONAL_NUMBER}
            error={error('womenSupport.womenOnTeam')}
          />
        </div>
        <YesNoField
          label="Is your direct manager a woman?"
          value={womenSupport.hasWomanManager}
          onChange={(hasWomanManager) => onChange('womenSupport', { hasWomanManager })}
        />
        <CheckboxGroup
          label="Support your company provides"
          options={WOMEN_SUPPORT_OPTIONS}
          value={womenSupport.support}
          onChange={(support) => onChange('womenSupport', { support })}
        />
        <YesNoNotSureField
          label="Do you believe your company handles issues seriously?"
          value={womenSupport.issuesHandledSeriously}
          onChange={(issuesHandledSeriously) =>
            onChange('womenSupport', { issuesHandledSeriously })
          }
        />
      </DataSection>

      <DataSection
        title="Promotion"
        icon={<TrendingUp size={18} strokeWidth={1.8} absoluteStrokeWidth />}
        iconClassName={styles.iconPromotion}
        skipped={promotion.skipped}
        onSkipChange={(skipped) => onChange('promotion', { skipped })}
      >
        <div className={styles.row}>
          <SelectField
            label="Time to promotion"
            value={promotion.timeToPromotion}
            options={PROMOTION_TIMES}
            onChange={(timeToPromotion) => onChange('promotion', { timeToPromotion })}
            error={error('promotion.timeToPromotion')}
          />
          <SelectField
            label="Promotion cycle"
            value={promotion.cycle}
            options={PROMOTION_CYCLE_OPTIONS}
            onChange={(cycle) => onChange('promotion', { cycle })}
            error={error('promotion.cycle')}
          />
        </div>
        <YesNoField
          label="Was your last promotion transparent?"
          value={promotion.lastPromotionTransparent}
          onChange={(lastPromotionTransparent) =>
            onChange('promotion', { lastPromotionTransparent })
          }
        />
        <CheckboxGroup
          label="Promotion support your company provides"
          options={PROMOTION_SUPPORT_OPTIONS}
          value={promotion.support}
          onChange={(support) => onChange('promotion', { support })}
        />
        <YesNoNotSureField
          label="Do you believe promotions are fair?"
          value={promotion.promotionsFair}
          onChange={(promotionsFair) => onChange('promotion', { promotionsFair })}
        />
      </DataSection>

      <DataSection
        title="Benefits"
        icon={<Gift size={18} strokeWidth={1.8} absoluteStrokeWidth />}
        iconClassName={styles.iconBenefits}
        skipped={benefits.skipped}
        onSkipChange={(skipped) => onChange('benefits', { skipped })}
      >
        <div className={styles.row}>
          <TextField
            label="Health insurance"
            inputMode="decimal"
            value={benefits.healthInsurancePct}
            onChange={(healthInsurancePct) => onChange('benefits', { healthInsurancePct })}
            placeholder="% of premium your employer pays, or N/A"
            error={error('benefits.healthInsurancePct')}
          />
          <TextField
            label="Wellness budget (per month)"
            inputMode="decimal"
            value={benefits.wellnessBudgetUsdPerMonth}
            onChange={(wellnessBudgetUsdPerMonth) =>
              onChange('benefits', { wellnessBudgetUsdPerMonth })
            }
            placeholder="USD per month, or N/A"
            error={error('benefits.wellnessBudgetUsdPerMonth')}
          />
        </div>
        <YesNoField
          label="Do you use your wellness budget?"
          value={benefits.usesWellnessBudget}
          onChange={(usesWellnessBudget) => onChange('benefits', { usesWellnessBudget })}
        />
        <CheckboxGroup
          label="Welfare benefits your company provides"
          options={WELFARE_BENEFIT_OPTIONS}
          value={benefits.welfare}
          onChange={(welfare) => onChange('benefits', { welfare })}
        />
        <YesNoNotSureField
          label="Do you feel supported by your benefits?"
          value={benefits.feelSupported}
          onChange={(feelSupported) => onChange('benefits', { feelSupported })}
        />
      </DataSection>

      <DataSection
        title="Paid maternity leave"
        icon={<Baby size={18} strokeWidth={1.8} absoluteStrokeWidth />}
        iconClassName={styles.iconMaternity}
        skipped={maternity.skipped}
        onSkipChange={(skipped) => onChange('maternity', { skipped })}
      >
        <div className={styles.row}>
          <SelectField
            label="Leave duration"
            value={maternity.leaveDuration}
            options={LEAVE_DURATIONS}
            onChange={(leaveDuration) => onChange('maternity', { leaveDuration })}
            error={error('maternity.leaveDuration')}
          />
          <TextField
            label="Pay during leave"
            inputMode="decimal"
            value={maternity.payPercent}
            onChange={(payPercent) => onChange('maternity', { payPercent })}
            placeholder="% of your normal pay, or N/A"
            error={error('maternity.payPercent')}
          />
        </div>
        <YesNoField
          label="Is return-to-work support available?"
          value={maternity.returnToWorkSupport}
          onChange={(returnToWorkSupport) => onChange('maternity', { returnToWorkSupport })}
        />
        <CheckboxGroup
          label="Parental support your company provides"
          options={PARENTAL_SUPPORT_OPTIONS}
          value={maternity.support}
          onChange={(support) => onChange('maternity', { support })}
        />
        <YesNoNotSureField
          label="Do you feel supported during leave?"
          value={maternity.feelSupported}
          onChange={(feelSupported) => onChange('maternity', { feelSupported })}
        />
      </DataSection>

      {notice}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.small}`}
          onClick={onBack}
          disabled={isPending}
        >
          ‹ Back
        </button>
        <button
          type="submit"
          className={`${styles.button} ${styles.primary} ${styles.small} ${styles.save}`}
          disabled={isPending || !canSave}
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

/** "Your data stays private", beside the step 2 boxes. */
export function PrivacyPanel() {
  return (
    <aside className={styles.privacy} aria-labelledby="privacy-title">
      <h2 id="privacy-title" className={styles.privacyTitle}>
        Your data stays private
      </h2>
      <ul className={styles.privacyList}>
        <li>Always anonymous</li>
        <li>Shown only after 5+ people share</li>
        <li>One submission per company every 90 days</li>
        <li>Edit it anytime from your Profile</li>
      </ul>
    </aside>
  );
}
