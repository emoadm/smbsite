export type EmailJobKind = 'register-otp' | 'login-otp' | 'welcome';

export interface EmailJobPayload {
  to: string;
  kind: EmailJobKind;
  otpCode?: string;
  expiresAt?: Date;
  fullName?: string;
}

export interface EmailQueue {
  addEmailJob(payload: EmailJobPayload): Promise<void>;
}

class StubEmailQueue implements EmailQueue {
  async addEmailJob(payload: EmailJobPayload): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Email queue not configured — plan 1.10 must ship before production deploy',
      );
    }
    // dev/test: structured-log so server-action tests can assert enqueue happened
    console.warn('[email-queue stub]', payload.kind, '→', payload.to);
  }
}

let _queue: EmailQueue = new StubEmailQueue();

export function setEmailQueue(q: EmailQueue): void {
  _queue = q;
}

export async function addEmailJob(payload: EmailJobPayload): Promise<void> {
  await _queue.addEmailJob(payload);
}
