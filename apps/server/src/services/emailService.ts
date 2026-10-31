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
      text: notification.text
    });
  } catch (error) {
    console.error(`Email notification failed for "${notification.subject}":`, error);
  }
}
