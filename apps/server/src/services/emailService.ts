import nodemailer from 'nodemailer';

type Notification = {
  subject: string;
  text: string;
  to?: string;
};

const smtpHost = process.env.SMTP_HOST ?? 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT ?? 465);
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD?.replace(/\s/g, '');
const defaultNotificationRecipient = process.env.MAIL_NOTIFY_TO ?? smtpUser;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createEmailHtml(notification: Notification): string {
  const message = escapeHtml(notification.text).replace(/\n/g, '<br>');
  const subject = escapeHtml(notification.subject);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">
    <div style="padding:32px 16px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:16px;overflow:hidden;">
        <div style="background:#176b87;padding:24px 28px;color:#ffffff;">
          <div style="font-size:24px;font-weight:700;">GharSewa</div>
          <div style="margin-top:6px;font-size:13px;opacity:.9;">Reliable home services</div>
        </div>
        <div style="padding:30px 28px;">
          <h1 style="margin:0 0 18px;font-size:22px;color:#172033;">${subject}</h1>
          <div style="font-size:15px;line-height:1.8;color:#4b5565;">${message}</div>
        </div>
        <div style="border-top:1px solid #e5eaf2;padding:18px 28px;color:#7a8494;font-size:12px;">
          This is an automated message from GharSewa. Please do not reply to this email.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

const transporter = smtpUser && smtpPassword
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword }
    })
  : undefined;

export async function sendNotification(notification: Notification): Promise<void> {
  const recipient = notification.to ?? defaultNotificationRecipient;
  if (!transporter || !smtpUser || !smtpPassword || !recipient) {
    console.error('Email notification skipped: SMTP_USER and SMTP_PASSWORD are required.');
    return;
  }

  try {
    await transporter.sendMail({
      from: smtpUser,
      to: recipient,
      subject: notification.subject,
      text: notification.text,
      html: createEmailHtml(notification)
    });
  } catch (error) {
    console.error(`Email notification failed for "${notification.subject}":`, error);
  }
}
