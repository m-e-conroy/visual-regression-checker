import { PrismaClient } from '@prisma/client';
import nodemailer, { SendMailOptions } from 'nodemailer';

const prisma = new PrismaClient();

interface NotificationPayload {
  userId: string;
  pageUrl: string;
  diffPercentage: number;
  diffPath: string | null;
}

export async function dispatchNotifications({ userId, pageUrl, diffPercentage, diffPath }: NotificationPayload) {
  try {
    // Fetch global SMTP settings
    const appSettings = await prisma.appSettings.findUnique({
      where: { id: 'global' }
    });

    // Fetch user-specific notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true }
    });

    if (!user || !user.settings) {
      console.log('User or settings not found. Skipping notifications.');
      return;
    }

    const { emailNotifications, teamsNotifications, teamsWebhookUrl } = user.settings;

    // 1. Send Email Notification
    if (emailNotifications && appSettings?.smtpHost && appSettings?.smtpUser) {
      const transporter = nodemailer.createTransport({
        host: appSettings.smtpHost,
        port: appSettings.smtpPort || 587,
        secure: appSettings.smtpPort === 465,
        auth: {
          user: appSettings.smtpUser,
          pass: appSettings.smtpPass || '',
        },
      });

      const mailOptions: SendMailOptions = {
        from: `"Visual Regression Checker" <${appSettings.smtpUser}>`,
        to: user.email,
        subject: `Visual Regression Detected: ${pageUrl}`,
        text: `A visual difference of ${diffPercentage}% was detected on ${pageUrl}. Please check the dashboard.`,
        html: `<h2>Visual Regression Alert</h2>
               <p>A visual difference of <strong>${diffPercentage}%</strong> was detected on <a href="${pageUrl}">${pageUrl}</a>.</p>
               <p>Please log in to the Visual Regression Checker dashboard to review the changes.</p>`,
      };

      // Attach diff image if available
      if (diffPath) {
        mailOptions.attachments = [
          {
            filename: 'diff.png',
            path: diffPath,
            cid: 'diff_image'
          }
        ];
        mailOptions.html += `<br/><img src="cid:diff_image" style="max-width: 100%; border: 1px solid #ccc;"/>`;
      }

      await transporter.sendMail(mailOptions);
      console.log(`Email notification sent to ${user.email}`);
    }

    // 2. Send MS Teams Webhook Notification
    if (teamsNotifications && teamsWebhookUrl) {
      const payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "0070f3",
        "summary": "Visual Regression Detected",
        "sections": [{
            "activityTitle": "Visual Regression Alert",
            "activitySubtitle": pageUrl,
            "facts": [{
                "name": "Difference:",
                "value": `${diffPercentage}%`
            }],
            "markdown": true
        }]
      };

      await fetch(teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('MS Teams notification dispatched.');
    }
    
  } catch (error) {
    console.error('Failed to dispatch notifications:', error);
  }
}
