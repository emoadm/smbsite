// React import required at runtime: this module is loaded by `tsx scripts/start-worker.ts`,
// which uses esbuild's classic JSX transform — JSX compiles to `React.createElement(...)`,
// so `React` must be in scope. Next.js's SWC uses the automatic runtime and would not need this.
import React from 'react';
import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { render } from '@react-email/render';
import { OtpEmail } from './templates/OtpEmail';
import { LoginOtpEmail } from './templates/LoginOtpEmail';
import { WelcomeEmail } from './templates/WelcomeEmail';
import { NewsletterEmail, type NewsletterTopic } from './templates/NewsletterEmail';
import { SubmissionStatusEmail } from './templates/SubmissionStatusEmail';
import { AccountSuspendedEmail } from './templates/AccountSuspendedEmail';
import { sendBrevoEmail } from './brevo';
import { EMAIL_QUEUE_NAME, type EmailJobPayload, addEmailJob } from './queue';
import { renderLexicalToHtml } from '../newsletter/lexical-to-html';
import { signUnsubToken } from '../unsubscribe/hmac';
import { getNewsletterRecipients } from '../newsletter/recipients';
import { brevoBlocklist } from '../newsletter/brevo-sync';
import { logger } from '../logger';
import { loadT } from './i18n-direct';
import { db } from '@/db';
import { submissions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

function workerConnection(): IORedis {
  const url = process.env.UPSTASH_REDIS_URL!;
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
}

// Use the shared i18n-direct loadT — it supports dotted-key lookup
// (e.g. `topicChip.newsletter_voting`, `footer.preferencesIntro`). The
// previous local loadT only did flat dict[key] resolution, so nested
// newsletter keys returned the literal key string and rendered raw in
// production emails (operator report 2026-05-08: footer.* and the topic
// chip showed as TOPICCHIP.NEWSLETTER_VOTING / footer.preferencesIntro
// in the inbox while greetingNamed — a flat key — rendered fine).

type ProcessorResult = { messageId: string } | { fannedOut: number };

async function processor(job: Job<EmailJobPayload>): Promise<ProcessorResult> {
  const { to, kind, otpCode, fullName } = job.data;
  let subject = '';
  let html = '';
  let text = '';

  switch (kind) {
    case 'register-otp': {
      const t = loadT('email.registerOtp');
      subject = t('subject');
      const props = {
        t,
        code: otpCode!,
        fullName: fullName ?? '',
        validityHours: 48,
      };
      html = await render(<OtpEmail {...props} />);
      text = await render(<OtpEmail {...props} />, { plainText: true });
      break;
    }
    case 'login-otp': {
      const t = loadT('email.loginOtp');
      subject = t('subject');
      const props = { t, code: otpCode!, validityMinutes: 10 };
      html = await render(<LoginOtpEmail {...props} />);
      text = await render(<LoginOtpEmail {...props} />, { plainText: true });
      break;
    }
    case 'welcome': {
      const t = loadT('email.welcome');
      subject = t('subject');
      const props = { t, fullName: fullName ?? '' };
      html = await render(<WelcomeEmail {...props} />);
      text = await render(<WelcomeEmail {...props} />, { plainText: true });
      break;
    }

    // Phase 5 D-05 / NOTIF-09 — fan-out trigger.
    // Loads Payload doc → queries recipient list → enqueues one sub-job per recipient.
    case 'newsletter-blast': {
      const newsletterId = job.data.newsletterId!;
      const { getPayload } = await import('payload');
      const config = (await import('@/payload.config')).default;
      const payloadInst = await getPayload({ config });
      const doc = (await payloadInst.findByID({
        collection: 'newsletters' as never,
        id: newsletterId,
      })) as { status?: string; topic?: string } | null;
      // Pitfall 3 — skip if cancelled mid-flight.
      if (!doc || doc.status === 'cancelled') {
        return { fannedOut: 0 };
      }
      const topic = doc.topic as NewsletterTopic;
      const recipients = await getNewsletterRecipients(topic);
      // Update Payload status to 'sending' before fan-out.
      await payloadInst.update({
        collection: 'newsletters' as never,
        id: newsletterId,
        data: { status: 'sending' } as never,
      });
      // Fan out per-recipient sub-jobs.
      for (const r of recipients) {
        await addEmailJob({
          to: r.email,
          kind: 'newsletter-send-recipient',
          userId: r.id,
          topic,
          newsletterId,
          fullName: r.full_name,
        });
      }
      // Mark sent (the per-recipient sub-jobs run async; for v1 we treat
      // successful enqueue as success — failed sends will surface as failed
      // BullMQ jobs in the queue dashboard).
      await payloadInst.update({
        collection: 'newsletters' as never,
        id: newsletterId,
        data: { status: 'sent' } as never,
      });
      logger.info(
        { newsletterId, topic, fannedOut: recipients.length },
        'newsletter-blast.fanout',
      );
      return { fannedOut: recipients.length };
    }

    // Phase 5 NOTIF-02 / NOTIF-06 / D-14 — per-recipient send with RFC 8058 headers.
    case 'newsletter-send-recipient': {
      const t = loadT('email.newsletter');
      const userId = job.data.userId!;
      const topic = job.data.topic as NewsletterTopic;
      const newsletterId = job.data.newsletterId!;

      // Re-load doc for subject/preview/body/topic — late-binds editor changes.
      const { getPayload } = await import('payload');
      const config = (await import('@/payload.config')).default;
      const payloadInst = await getPayload({ config });
      const doc = (await payloadInst.findByID({
        collection: 'newsletters' as never,
        id: newsletterId,
      })) as
        | {
            status?: string;
            subject?: string;
            previewText?: string;
            body?: unknown;
          }
        | null;
      if (!doc || doc.status === 'cancelled') {
        // Pitfall 3 — abort silently on cancel after fan-out.
        return { messageId: 'skipped-cancelled' };
      }

      subject = String(doc.subject ?? '');
      const previewText = String(doc.previewText ?? '');
      const bodyHtml = renderLexicalToHtml(doc.body as never);

      const token = signUnsubToken(userId);
      const origin = process.env.SITE_ORIGIN ?? 'https://chastnik.eu';
      const unsubUrl = `${origin}/api/unsubscribe?token=${token}`;
      const preferencesUrl = `${origin}/member/preferences`;

      const props = {
        t,
        fullName: fullName ?? '',
        subject,
        previewText,
        topic,
        bodyHtml,
        unsubUrl,
        preferencesUrl,
        year: new Date().getFullYear(),
      };
      html = await render(<NewsletterEmail {...props} />);
      text = await render(<NewsletterEmail {...props} />, { plainText: true });

      // RFC 8058 + Pitfall 2 — explicit List-Unsubscribe overrides Brevo auto-injection.
      const headers = {
        'List-Unsubscribe': `<${unsubUrl}>, <mailto:unsubscribe@news.chastnik.eu?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };

      const tFrom = loadT('email.from');
      const result = await sendBrevoEmail({
        to: { email: to, name: fullName },
        subject,
        htmlContent: html,
        textContent: text,
        from: {
          email: process.env.EMAIL_FROM_NEWSLETTER ?? 'newsletter@news.chastnik.eu',
          name: tFrom('name'),
        },
        headers,
      });

      // D-24 — log only non-PII identifiers.
      logger.info(
        { user_id: userId, newsletterId, brevo_message_id: result.messageId },
        'newsletter-send-recipient.success',
      );
      return result;
    }

    // Phase 5 D-02 — single test send to editor's own email.
    case 'newsletter-test': {
      const t = loadT('email.newsletter');
      const newsletterId = job.data.newsletterId!;
      const topic = (job.data.topic ?? 'newsletter_general') as NewsletterTopic;

      const { getPayload } = await import('payload');
      const config = (await import('@/payload.config')).default;
      const payloadInst = await getPayload({ config });
      const doc = (await payloadInst.findByID({
        collection: 'newsletters' as never,
        id: newsletterId,
      })) as { subject?: string; previewText?: string; body?: unknown } | null;
      if (!doc) return { messageId: 'skipped-missing-doc' };

      subject = `[ТЕСТ] ${String(doc.subject ?? '')}`; // i18n-allow: test-mode subject marker
      const previewText = String(doc.previewText ?? '');
      const bodyHtml = renderLexicalToHtml(doc.body as never);

      // Real preferencesUrl + token-bearing unsubUrl with `?test=1` guard.
      // Earlier this used `#preview` sentinels for both, which made the
      // links dead in the inbox (operator report 2026-05-08). Production
      // unsub clicks call brevoBlocklist() which is sticky at the ESP
      // level — if the editor accidentally clicked unsub on their own
      // test it would suppress them globally in Brevo even after they
      // re-subscribed in-app. The `?test=1` flag is honored by
      // src/app/api/unsubscribe/route.ts as "show the redirect, don't
      // mutate state" so editors can verify the link end-to-end safely.
      // Defense-in-depth: coerce to string at the worker boundary too.
      // sendTest already does this but the EmailJobPayload type is `string`
      // and a future caller could pass a number through (Payload admin user
      // IDs are numeric — caused first-click dead `?reason=malformed` page).
      const editorUserId =
        job.data.userId != null ? String(job.data.userId) : undefined;
      const origin = process.env.SITE_ORIGIN ?? 'https://chastnik.eu';
      const preferencesUrl = `${origin}/member/preferences`;
      const unsubUrl = editorUserId
        ? `${origin}/api/unsubscribe?token=${signUnsubToken(editorUserId)}&test=1`
        : `${origin}/member/preferences`;

      const props = {
        t,
        fullName: fullName ?? '',
        subject,
        previewText,
        topic,
        bodyHtml,
        unsubUrl,
        preferencesUrl,
        year: new Date().getFullYear(),
      };
      html = await render(<NewsletterEmail {...props} />);
      text = await render(<NewsletterEmail {...props} />, { plainText: true });

      const tFrom = loadT('email.from');
      const result = await sendBrevoEmail({
        to: { email: to, name: fullName },
        subject,
        htmlContent: html,
        textContent: text,
        from: {
          email: process.env.EMAIL_FROM_NEWSLETTER ?? 'newsletter@news.chastnik.eu',
          name: tFrom('name'),
        },
        // Test sends do NOT include List-Unsubscribe — they go to a single
        // editor inbox; one-click unsub UX is not exercised here.
      });
      // Update Payload doc lastTestSentAt + clear lastEditedAfterTestAt.
      await payloadInst.update({
        collection: 'newsletters' as never,
        id: newsletterId,
        data: {
          lastTestSentAt: new Date().toISOString(),
          lastEditedAfterTestAt: false,
        } as never,
      });
      logger.info(
        { newsletterId, brevo_message_id: result.messageId },
        'newsletter-test.success',
      );
      return result;
    }

    // Phase 5 D-14 — Brevo blocklist retry path when the inline-await in
    // /api/unsubscribe (Plan 05-06) failed.
    case 'unsubscribe-brevo-retry': {
      const unsubEmail = job.data.unsubEmail!;
      await brevoBlocklist(unsubEmail);
      logger.info({}, 'unsubscribe-brevo-retry.success');
      return { messageId: 'brevo-blocklist-ok' };
    }

    // Phase 4 Plan 04-07 — submission status + suspension notification emails.

    case 'submission-status-approved': {
      // job.data.userId is overloaded to carry submissionId (Plan 04-06 convention)
      const submissionId = job.data.userId;
      if (!submissionId) throw new Error('submissionId missing in job payload (submission-status-approved)');
      const [row] = await db
        .select({
          title: submissions.title,
          submitter_email: users.email,
          submitter_full_name: users.full_name,
        })
        .from(submissions)
        .innerJoin(users, eq(submissions.submitter_id, users.id))
        .where(eq(submissions.id, submissionId))
        .limit(1);
      if (!row) {
        logger.warn({ submissionId }, 'submission-status-approved: submission row missing');
        return { messageId: 'skipped-missing-row' };
      }
      const tEmail = loadT('email.submissionStatus.approved');
      const tShared = loadT('email.submissionStatus');
      const origin = process.env.SITE_ORIGIN ?? 'https://chastnik.eu';
      const emailElement = (
        <SubmissionStatusEmail
          t={tEmail}
          tShared={tShared}
          variant="approved"
          fullName={row.submitter_full_name}
          title={row.title ?? ''}
          siteOrigin={origin}
        />
      );
      const emailHtml = await render(emailElement);
      const emailText = await render(emailElement, { plainText: true });
      return sendBrevoEmail({
        to: { email: row.submitter_email, name: row.submitter_full_name },
        subject: tEmail('subject'),
        htmlContent: emailHtml,
        textContent: emailText,
        from: {
          email: process.env.EMAIL_FROM_TRANSACTIONAL ?? 'no-reply@auth.chastnik.eu',
          name: loadT('email.from')('name'),
        },
      });
    }

    case 'submission-status-rejected': {
      const submissionId = job.data.userId;
      if (!submissionId) throw new Error('submissionId missing in job payload (submission-status-rejected)');
      const [row] = await db
        .select({
          title: submissions.title,
          moderator_note: submissions.moderator_note,
          submitter_email: users.email,
          submitter_full_name: users.full_name,
        })
        .from(submissions)
        .innerJoin(users, eq(submissions.submitter_id, users.id))
        .where(eq(submissions.id, submissionId))
        .limit(1);
      if (!row) {
        logger.warn({ submissionId }, 'submission-status-rejected: submission row missing');
        return { messageId: 'skipped-missing-row' };
      }
      const tEmail = loadT('email.submissionStatus.rejected');
      const tShared = loadT('email.submissionStatus');
      const origin = process.env.SITE_ORIGIN ?? 'https://chastnik.eu';
      const emailElement = (
        <SubmissionStatusEmail
          t={tEmail}
          tShared={tShared}
          variant="rejected"
          fullName={row.submitter_full_name}
          title={row.title ?? ''}
          moderatorNote={row.moderator_note ?? ''}
          siteOrigin={origin}
        />
      );
      const emailHtml = await render(emailElement);
      const emailText = await render(emailElement, { plainText: true });
      return sendBrevoEmail({
        to: { email: row.submitter_email, name: row.submitter_full_name },
        subject: tEmail('subject'),
        htmlContent: emailHtml,
        textContent: emailText,
        from: {
          email: process.env.EMAIL_FROM_TRANSACTIONAL ?? 'no-reply@auth.chastnik.eu',
          name: loadT('email.from')('name'),
        },
      });
    }

    case 'user-suspended': {
      const tEmail = loadT('email.suspended');
      const emailElement = (
        <AccountSuspendedEmail
          t={tEmail}
          fullName={job.data.fullName ?? ''}
          reason={job.data.suspensionReason ?? ''}
        />
      );
      const emailHtml = await render(emailElement);
      const emailText = await render(emailElement, { plainText: true });
      return sendBrevoEmail({
        to: { email: to, name: fullName },
        subject: tEmail('subject'),
        htmlContent: emailHtml,
        textContent: emailText,
        from: {
          email: process.env.EMAIL_FROM_TRANSACTIONAL ?? 'no-reply@auth.chastnik.eu',
          name: loadT('email.from')('name'),
        },
      });
    }
  }

  // Phase 1 paths fall through to the existing send call.
  const tFrom = loadT('email.from');
  return sendBrevoEmail({
    to: { email: to, name: fullName },
    subject,
    htmlContent: html,
    textContent: text,
    from: {
      email: process.env.EMAIL_FROM_TRANSACTIONAL ?? 'no-reply@auth.example.invalid',
      name: tFrom('name'),
    },
  });
}

export function startWorker() {
  return new Worker<EmailJobPayload, ProcessorResult>(
    EMAIL_QUEUE_NAME,
    processor,
    {
      connection: workerConnection(),
      concurrency: 3,
    },
  );
}
