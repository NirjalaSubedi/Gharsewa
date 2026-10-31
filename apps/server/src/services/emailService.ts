import nodemailer from 'nodemailer';

type Notification = {
  subject: string;
  text: string;
};

const smtpHost = process.env.SMTP_HOST ?? 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT ?? 465);
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD?.replace(/\s/g, '');
const notificationRecipient = process.env.MAIL_NOTIFY_TO ?? smtpUser;

const transporter = smtpUser && smtpPassword
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword }
    })
  : undefined;

export async function sendNotification(notification: Notification): Promise<void> {
  if (!transporter || !smtpUser || !smtpPassword || !notificationRecipient) {
    console.error('Email notification skipped: SMTP_USER and SMTP_PASSWORD are required.');
    return;
  }

  try {
    await transporter.sendMail({
      from: smtpUser,
      to: notificationRecipient,
      subject: notification.subject,
      text: notification.text
    });
  } catch (error) {
    console.error(`Email notification failed for "${notification.subject}":`, error);
  }
}
