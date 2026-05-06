import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface MailDriver {
  send(msg: MailMessage): Promise<void>;
}

const consoleDriver: MailDriver = {
  async send(msg) {
    logger.info(
      { to: msg.to, subject: msg.subject },
      `\n========================================\n📧 EMAIL (console driver)\n----------------------------------------\nTo:      ${msg.to}\nSubject: ${msg.subject}\n----------------------------------------\n${msg.text ?? stripHtml(msg.html)}\n========================================\n`
    );
  },
};

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

/**
 * Lazy-build the chosen driver. Each driver only requires its credentials at
 * send-time, so a misconfigured non-default provider doesn't block boot — we
 * just fall back to console with a warning.
 */
function buildGmailDriver(): MailDriver {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    logger.warn('EMAIL_PROVIDER=gmail but GMAIL_USER/GMAIL_APP_PASSWORD missing — falling back to console');
    return consoleDriver;
  }
  // Dynamic import keeps nodemailer optional for users on console/resend/sendgrid.
  let transporterPromise: Promise<any> | null = null;
  const getTransporter = async () => {
    if (!transporterPromise) {
      transporterPromise = (async () => {
        const nm: any = await import('nodemailer');
        const factory = nm.createTransport ?? nm.default?.createTransport;
        return factory({
          service: 'gmail',
          auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
        });
      })();
    }
    return transporterPromise;
  };
  return {
    async send(msg) {
      const t = await getTransporter();
      await t.sendMail({
        from: `LearnHub <${env.GMAIL_USER}>`,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text ?? stripHtml(msg.html),
      });
    },
  };
}

function buildResendDriver(): MailDriver {
  if (!env.RESEND_API_KEY) {
    logger.warn('EMAIL_PROVIDER=resend but RESEND_API_KEY missing — falling back to console');
    return consoleDriver;
  }
  const from = env.RESEND_FROM ?? 'LearnHub <onboarding@resend.dev>';
  return {
    async send(msg) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text ?? stripHtml(msg.html),
        }),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        throw new Error(`Resend send failed (${r.status}): ${body.slice(0, 240)}`);
      }
    },
  };
}

function buildSendgridDriver(): MailDriver {
  if (!env.SENDGRID_API_KEY) {
    logger.warn('EMAIL_PROVIDER=sendgrid but SENDGRID_API_KEY missing — falling back to console');
    return consoleDriver;
  }
  const fromEmail = env.SENDGRID_FROM ?? 'no-reply@learnhub.dev';
  return {
    async send(msg) {
      const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: msg.to }] }],
          from: { email: fromEmail, name: 'LearnHub' },
          subject: msg.subject,
          content: [
            { type: 'text/plain', value: msg.text ?? stripHtml(msg.html) },
            { type: 'text/html', value: msg.html },
          ],
        }),
      });
      if (!r.ok && r.status !== 202) {
        const body = await r.text().catch(() => '');
        throw new Error(`SendGrid send failed (${r.status}): ${body.slice(0, 240)}`);
      }
    },
  };
}

const drivers: Record<string, () => MailDriver> = {
  console: () => consoleDriver,
  gmail: buildGmailDriver,
  resend: buildResendDriver,
  sendgrid: buildSendgridDriver,
};

const driver = (drivers[env.EMAIL_PROVIDER] ?? drivers.console)();

async function safeSend(msg: MailMessage) {
  try {
    await driver.send(msg);
  } catch (err) {
    // Mail failure must never crash the parent flow — log and downgrade to console
    // so the operator at least sees what was supposed to go out.
    logger.error({ err: (err as Error).message, to: msg.to }, 'mail send failed; logging instead');
    await consoleDriver.send(msg);
  }
}

export const mailer = {
  async send(msg: MailMessage) {
    await safeSend(msg);
  },

  async sendVerification(to: string, name: string, link: string) {
    await safeSend({
      to,
      subject: 'Verify your LearnHub email',
      html: verificationTemplate(name, link),
    });
  },

  async sendPasswordReset(to: string, name: string, link: string) {
    await safeSend({
      to,
      subject: 'Reset your LearnHub password',
      html: passwordResetTemplate(name, link),
    });
  },

  async sendPasswordChanged(to: string, name: string) {
    await safeSend({
      to,
      subject: 'Your LearnHub password was changed',
      html: passwordChangedTemplate(name),
    });
  },

  async sendNotification(to: string, name: string, title: string, body: string, link?: string) {
    await safeSend({
      to,
      subject: title,
      html: notificationTemplate(name, title, body, link),
    });
  },
};

const wrap = (inner: string) => `
<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#0a0a0f;color:#e5e7eb;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#15151f;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px;">
    <h1 style="margin:0 0 16px;font-size:22px;background:linear-gradient(90deg,#a78bfa,#f472b6);-webkit-background-clip:text;color:transparent;">LearnHub</h1>
    ${inner}
    <p style="margin-top:32px;font-size:12px;color:#6b7280;">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body></html>`;

const verificationTemplate = (name: string, link: string) => wrap(`
  <h2 style="font-size:18px;margin:0 0 12px;">Hi ${escape(name)} 👋</h2>
  <p>Welcome to LearnHub! Please confirm your email to activate your account.</p>
  <p style="margin:24px 0;">
    <a href="${link}" style="display:inline-block;padding:12px 20px;background:linear-gradient(90deg,#8b5cf6,#ec4899);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Verify email</a>
  </p>
  <p style="font-size:12px;color:#9ca3af;">Or paste this link into your browser:<br/><a href="${link}" style="color:#a78bfa;word-break:break-all;">${link}</a></p>
  <p style="font-size:12px;color:#9ca3af;">This link expires in 24 hours.</p>
`);

const passwordResetTemplate = (name: string, link: string) => wrap(`
  <h2 style="font-size:18px;margin:0 0 12px;">Reset your password</h2>
  <p>Hi ${escape(name)}, click the button below to set a new password.</p>
  <p style="margin:24px 0;">
    <a href="${link}" style="display:inline-block;padding:12px 20px;background:linear-gradient(90deg,#10b981,#06b6d4);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset password</a>
  </p>
  <p style="font-size:12px;color:#9ca3af;">Or paste this link:<br/><a href="${link}" style="color:#34d399;word-break:break-all;">${link}</a></p>
  <p style="font-size:12px;color:#9ca3af;">This link expires in 1 hour.</p>
`);

const passwordChangedTemplate = (name: string) => wrap(`
  <h2 style="font-size:18px;margin:0 0 12px;">Password changed</h2>
  <p>Hi ${escape(name)}, your LearnHub password was just changed. If this wasn't you, reset it immediately and contact support.</p>
`);

const notificationTemplate = (name: string, title: string, body: string, link?: string) => wrap(`
  <h2 style="font-size:18px;margin:0 0 12px;">${escape(title)}</h2>
  <p>Hi ${escape(name)},</p>
  <p>${escape(body)}</p>
  ${link ? `<p style="margin:24px 0;"><a href="${link}" style="display:inline-block;padding:10px 18px;background:linear-gradient(90deg,#8b5cf6,#06b6d4);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open in LearnHub</a></p>` : ''}
`);

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
