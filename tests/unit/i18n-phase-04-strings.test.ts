import { describe, it, expect } from 'vitest';
import bg from '../../messages/bg.json';
import { readFileSync } from 'fs';
import { join } from 'path';

type Bag = Record<string, unknown>;
function getPath(obj: Bag, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Bag)[k];
    return undefined;
  }, obj as unknown);
}

const REQUIRED_KEYS = [
  // Public proposals page
  'submission.proposals.pageTitle',
  'submission.proposals.pageDescription',
  'submission.proposals.votingSoon',
  'submission.proposals.anonymousByline',
  'submission.proposals.emptyHeading',
  'submission.proposals.emptyBody',
  'submission.proposals.emptyCta',
  // Proposal form
  'submission.proposal.formTitle',
  'submission.proposal.formDescription',
  'submission.proposal.submitCta',
  'submission.proposal.successToast',
  'submission.proposal.fields.title',
  'submission.proposal.fields.body',
  'submission.proposal.fields.topic',
  // My proposals page
  'submission.myProposals.pageTitle',
  'submission.myProposals.emptyHeading',
  'submission.myProposals.emptyBody',
  'submission.myProposals.emptyCta',
  // Problem form
  'submission.problem.formTitle',
  'submission.problem.formDescription',
  'submission.problem.submitCta',
  'submission.problem.successToast',
  'submission.problem.fields.body',
  'submission.problem.fields.topic',
  'submission.problem.fields.level',
  'submission.problem.fields.oblast',
  // My problems page
  'submission.myProblems.pageTitle',
  'submission.myProblems.emptyHeading',
  'submission.myProblems.emptyBody',
  'submission.myProblems.emptyCta',
  // Status badges
  'submission.status.pending',
  'submission.status.approved',
  'submission.status.rejected',
  'submission.status.rejectionNotePrefix',
  // Errors and gates
  'submission.error.rateLimit',
  'submission.error.captchaFailed',
  'submission.error.validation',
  'submission.gate.unverified',
  'submission.gate.suspended',
  // Topics (7)
  'submission.topics.taxes',
  'submission.topics.admin_barriers',
  'submission.topics.financing',
  'submission.topics.labor',
  'submission.topics.digitalization',
  'submission.topics.energy',
  'submission.topics.other',
  // Public heat-map
  'problem.heatmap.pageTitle',
  'problem.heatmap.pageDescription',
  'problem.heatmap.suppressed',
  'problem.heatmap.tooltipFormat',
  'problem.heatmap.emptyBody',
  'problem.heatmap.emptyCta',
  'problem.heatmap.table.columnOblast',
  'problem.heatmap.table.columnCount',
  'problem.heatmap.table.columnTopTopic',
  'problem.heatmap.table.nationalLabel',
  'problem.heatmap.ariaMapLabel',
  'problem.anonymousByline',
  'problem.level.local',
  'problem.level.national',
  // DSA report
  'dsa.report.buttonLabel',
  'dsa.report.heading',
  'dsa.report.body',
  'dsa.report.categoryLabel',
  'dsa.report.categories.illegal',
  'dsa.report.categories.other',
  'dsa.report.reasonLabel',
  'dsa.report.reasonPlaceholder',
  'dsa.report.goodFaithLabel',
  'dsa.report.submitCta',
  'dsa.report.successHeading',
  'dsa.report.successBody',
  // Admin queue
  'admin.queue.pageTitle',
  'admin.queue.denied',
  'admin.queue.loginRequired',
  'admin.queue.pendingSummary',
  'admin.queue.tabProposals',
  'admin.queue.tabProblems',
  'admin.queue.tabDsa',
  'admin.queue.reviewAction',
  'admin.queue.empty',
  // Admin moderation dialogs
  'admin.moderation.approveHeading',
  'admin.moderation.approveBody',
  'admin.moderation.approveDismiss',
  'admin.moderation.approveAction',
  'admin.moderation.rejectHeading',
  'admin.moderation.rejectBody',
  'admin.moderation.rejectDismiss',
  'admin.moderation.rejectAction',
  'admin.moderation.suspendHeading',
  'admin.moderation.suspendBody',
  'admin.moderation.suspendDismiss',
  'admin.moderation.suspendAction',
  'admin.moderation.overrideHeading',
  'admin.moderation.overrideBody',
  'admin.moderation.overrideAction',
  // Admin suspended page
  'admin.suspended.pageTitle',
  'admin.suspended.body',
  // Email status-change templates
  'email.submissionStatus.approved.subject',
  'email.submissionStatus.approved.body',
  'email.submissionStatus.rejected.subject',
  'email.submissionStatus.rejected.body',
  'email.suspended.subject',
  'email.suspended.body',
];

describe('Phase 4 i18n string registry', () => {
  it('every required key resolves to a non-empty string', () => {
    for (const key of REQUIRED_KEYS) {
      const value = getPath(bg as Bag, key);
      expect(value, `Missing key: ${key}`).toBeTypeOf('string');
      expect((value as string).length, `Empty string for key: ${key}`).toBeGreaterThan(0);
    }
  });

  it('D-C1: anonymous attribution strings appear exactly once across all of bg.json', () => {
    const raw = readFileSync(join(process.cwd(), 'messages/bg.json'), 'utf8');
    expect((raw.match(/"Член на коалицията"/g) ?? []).length).toBe(1);
    expect((raw.match(/"Анонимен сигнал"/g) ?? []).length).toBe(1);
  });

  it('D-C1: banned anonymous-byline variants do not appear anywhere', () => {
    const raw = readFileSync(join(process.cwd(), 'messages/bg.json'), 'utf8');
    expect(raw).not.toMatch(/"Анонимен член"/);
    expect(raw).not.toMatch(/"Гражданин"/);
    expect(raw).not.toMatch(/"Потребител"/);
  });

  it('rate-limit error carries the {n} ICU placeholder', () => {
    const v = getPath(bg as Bag, 'submission.error.rateLimit') as string;
    expect(v).toMatch(/\{n\}/);
  });

  it('email.submissionStatus templates carry required ICU placeholders', () => {
    const approvedBody = getPath(bg as Bag, 'email.submissionStatus.approved.body') as string;
    expect(approvedBody).toMatch(/\{fullName\}/);
    expect(approvedBody).toMatch(/\{title\}/);
    const rejectedBody = getPath(bg as Bag, 'email.submissionStatus.rejected.body') as string;
    expect(rejectedBody).toMatch(/\{fullName\}/);
    expect(rejectedBody).toMatch(/\{title\}/);
    expect(rejectedBody).toMatch(/\{note\}/);
  });

  it('topic taxonomy: 7 keys exist under submission.topics', () => {
    const topics = getPath(bg as Bag, 'submission.topics') as Bag;
    expect(Object.keys(topics).sort()).toEqual(
      ['admin_barriers', 'digitalization', 'energy', 'financing', 'labor', 'other', 'taxes'].sort(),
    );
  });

  it('status badge labels match UI-SPEC §S5 verbatim', () => {
    expect(getPath(bg as Bag, 'submission.status.pending')).toBe('Изчаква преглед');
    expect(getPath(bg as Bag, 'submission.status.approved')).toBe('Одобрено');
    expect(getPath(bg as Bag, 'submission.status.rejected')).toBe('Отхвърлено');
  });
});
