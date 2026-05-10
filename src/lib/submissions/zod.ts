import { z } from '@/lib/zod-i18n';

// Topic taxonomy — 7 predefined categories matching submission.topics.* in messages/bg.json.
// Single source of truth shared by proposalSchema and problemReportSchema.
export const TopicEnum = z.enum([
  'taxes',
  'admin_barriers',
  'financing',
  'labor',
  'digitalization',
  'energy',
  'other',
]);

// Level for problem reports (local = oblast-level, national = country-wide).
export const LevelEnum = z.enum(['local', 'national']);

// ISO 3166-2:BG oblast code regex. Accepts BG-01 through BG-28.
// T-04-03-06: defense-in-depth validation on top of the UI Select (which
// enforces this via the OBLAST_NAMES keys, but Server Actions are reachable
// directly via RPC without going through the UI).
const OBLAST_CODE_RE = /^BG-(0[1-9]|1[0-9]|2[0-8])$/;

// Proposal submission schema.
// Char limits from UI-SPEC §S3: title 5-300, body 50-2000, topic from enum.
// The 'cf-turnstile-response' field holds the Cloudflare Turnstile token
// (inserted as a hidden input by TurnstileWidget — same pattern as register.ts).
export const proposalSchema = z.object({
  title: z.string().trim().min(5).max(300),
  body: z.string().trim().min(50).max(2000),
  topic: TopicEnum,
  'cf-turnstile-response': z.string().min(1),
});

// Problem report submission schema.
// Char limits from UI-SPEC §S4: body 30-1000.
// oblast is optional at object level but required via superRefine when level='local'.
export const problemReportSchema = z
  .object({
    body: z.string().trim().min(30).max(1000),
    topic: TopicEnum,
    level: LevelEnum,
    // Oblast may be empty string (when national selected) or a valid BG code.
    // Allow empty string explicitly so FormData always submits a value.
    oblast: z.union([z.string().regex(OBLAST_CODE_RE), z.literal('')]).optional(),
    'cf-turnstile-response': z.string().min(1),
  })
  .superRefine((data, ctx) => {
    // T-04-03-06: require a valid oblast code when level='local'.
    if (data.level === 'local' && (!data.oblast || data.oblast === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['oblast'],
        message: 'submission.error.validation',
      });
    }
  });

export type ProposalInput = z.infer<typeof proposalSchema>;
export type ProblemReportInput = z.infer<typeof problemReportSchema>;
