import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { render } from '@react-email/render';
import { OtpEmail } from './templates/OtpEmail';
import { LoginOtpEmail } from './templates/LoginOtpEmail';
import { WelcomeEmail } from './templates/WelcomeEmail';
import { sendBrevoEmail } from './brevo';
import { EMAIL_QUEUE_NAME, type EmailJobPayload } from './queue';
import bg from '../../../messages/bg.json';

function workerConnection(): IORedis {
  const url = process.env.UPSTASH_REDIS_URL!;
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
}

type EmailT = (key: string, vars?: Record<string, string | number>) => string;

// Worker runs as a standalone Node process (tsx scripts/start-worker.ts), outside the
// Next.js request scope, so next-intl's getTranslations() isn't reliable here. Load the
// Bulgarian message catalog directly and interpolate ICU-style placeholders ourselves —
// the templates only use {firstName}, {validityHours}, {validityMinutes}, {year}.
function loadT(namespace: string): EmailT {
  const dict = namespace
    .split('.')
    .reduce<Record<string, unknown>>(
      (node, key) => (node?.[key] as Record<string, unknown>) ?? {},
      bg as Record<string, unknown>,
    );
  return (key: string, vars?: Record<string, string | number>) => {
    const raw = (dict as Record<string, string>)[key];
    if (typeof raw !== 'string') return key;
    if (!vars) return raw;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      raw,
    );
  };
}

async function processor(job: Job<EmailJobPayload>): Promise<{ messageId: string }> {
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
  }

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
  return new Worker<EmailJobPayload, { messageId: string }>(
    EMAIL_QUEUE_NAME,
    processor,
    {
      connection: workerConnection(),
      concurrency: 3,
    },
  );
}
