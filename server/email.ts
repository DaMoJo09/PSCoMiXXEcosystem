import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  const freeMailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
  const domain = (fromEmail || '').split('@')[1]?.toLowerCase();
  const isFreeMail = freeMailDomains.includes(domain || '');
  const effectiveFrom = isFreeMail || !fromEmail
    ? 'Press Start CoMiXX <onboarding@resend.dev>'
    : fromEmail;
  if (isFreeMail) {
    console.warn(`[email] Configured from_email "${fromEmail}" is a free mail domain — using Resend default sender. Verify a custom domain in Resend to use your own address.`);
  }
  return {
    client: new Resend(apiKey),
    fromEmail: effectiveFrom
  };
}

const BRAND = {
  name: "Press Start CoMiXX",
  color: "#22d3ee",
  dark: "#09090b",
  url: "https://pscomixx.com",
};

function emailWrapper(title: string, content: string): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND.dark}; color: #e4e4e7; border: 2px solid #27272a;">
      <div style="padding: 24px; border-bottom: 4px solid ${BRAND.color};">
        <h1 style="margin: 0; color: #fff; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${BRAND.name}</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #fff; font-size: 18px; margin: 0 0 16px 0;">${title}</h2>
        ${content}
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid #27272a; text-align: center;">
        <p style="color: #71717a; font-size: 12px; margin: 0;">
          <a href="${BRAND.url}" style="color: ${BRAND.color}; text-decoration: none;">${BRAND.url}</a>
        </p>
      </div>
    </div>
  `;
}

function buttonHtml(text: string, href: string): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${href}" style="background: ${BRAND.color}; color: #000; padding: 12px 32px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; display: inline-block; border: 2px solid ${BRAND.color};">
        ${text}
      </a>
    </div>
  `;
}

export async function sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string) {
  const { client, fromEmail } = await getResendClient();
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

  const result = await client.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Reset Your Press Start CoMiXX Password',
    html: emailWrapper("Reset Your Password", `
      <p style="color: #a1a1aa; line-height: 1.6;">You requested to reset your password. Click the button below to create a new one. This link expires in 1 hour.</p>
      ${buttonHtml("Reset Password", resetLink)}
      <p style="color: #71717a; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      <p style="color: #71717a; font-size: 11px; word-break: break-all;">${resetLink}</p>
    `)
  });

  if (result.error) {
    console.error("[email] Resend API error:", result.error);
    throw new Error(`Resend error: ${result.error.message}`);
  }
  console.log("[email] Password reset email sent, id:", result.data?.id);
}

// Recipient for internal bug-report notifications. Override with BUG_REPORT_NOTIFY_EMAIL.
const BUG_REPORT_NOTIFY_EMAIL = process.env.BUG_REPORT_NOTIFY_EMAIL || "mojocreative1@gmail.com";

export async function sendBugReportNotification(report: {
  id: string;
  title: string;
  description: string;
  category?: string;
  severity?: string;
  app?: string;
  stepsToReproduce?: string | null;
  screenshotUrls?: string[] | null;
  contextData?: any;
  reporterEmail?: string | null;
  reporterName?: string | null;
}, baseUrl: string) {
  try {
    const { client, fromEmail } = await getResendClient();

    const sevColor: Record<string, string> = {
      low: "#22c55e",
      medium: "#eab308",
      high: "#f97316",
      critical: "#ef4444",
    };
    const sev = (report.severity || "medium").toLowerCase();
    const sevHex = sevColor[sev] || "#a1a1aa";

    const safeText = (s?: string | null) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const shotsHtml = (report.screenshotUrls && report.screenshotUrls.length > 0)
      ? `
        <h3 style="color:#fff;font-size:13px;margin:20px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;">Screenshots (${report.screenshotUrls.length})</h3>
        <div>
          ${report.screenshotUrls
            .map((u) => {
              const abs = u.startsWith("http") ? u : `${baseUrl}${u.startsWith("/") ? "" : "/"}${u}`;
              return `<div style="margin:8px 0;"><a href="${abs}" style="color:${BRAND.color};font-size:12px;word-break:break-all;">${abs}</a></div>`;
            })
            .join("")}
        </div>`
      : "";

    const ctxUrl = report.contextData?.url ? safeText(String(report.contextData.url)) : "";
    const ctxPage = report.contextData?.currentPage ? safeText(String(report.contextData.currentPage)) : "";
    const ctxUA = report.contextData?.userAgent ? safeText(String(report.contextData.userAgent)) : "";

    const subject = `[CoMiXX Bug] [${sev.toUpperCase()}] ${report.title}`;

    const html = emailWrapper(`New Bug Report — ${safeText(report.title)}`, `
      <table style="width:100%;border-collapse:collapse;margin:0 0 16px 0;">
        <tr>
          <td style="padding:6px 0;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:120px;">Severity</td>
          <td style="padding:6px 0;color:${sevHex};font-weight:bold;font-size:13px;">${sev.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Category</td>
          <td style="padding:6px 0;color:#e4e4e7;font-size:13px;">${safeText(report.category || "bug")}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">App</td>
          <td style="padding:6px 0;color:#e4e4e7;font-size:13px;">${safeText(report.app || "comixx")}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Reporter</td>
          <td style="padding:6px 0;color:#e4e4e7;font-size:13px;">${safeText(report.reporterName || "—")} ${report.reporterEmail ? `&lt;${safeText(report.reporterEmail)}&gt;` : ""}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Report ID</td>
          <td style="padding:6px 0;color:#a1a1aa;font-size:12px;font-family:monospace;">${safeText(report.id)}</td>
        </tr>
      </table>

      <h3 style="color:#fff;font-size:13px;margin:20px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;">Description</h3>
      <p style="color:#d4d4d8;line-height:1.6;white-space:pre-wrap;font-size:13px;">${safeText(report.description)}</p>

      ${report.stepsToReproduce
        ? `<h3 style="color:#fff;font-size:13px;margin:20px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;">Steps to Reproduce</h3>
           <p style="color:#d4d4d8;line-height:1.6;white-space:pre-wrap;font-size:13px;">${safeText(report.stepsToReproduce)}</p>`
        : ""}

      ${shotsHtml}

      <h3 style="color:#fff;font-size:13px;margin:20px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;">Context</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        ${ctxUrl ? `<tr><td style="padding:4px 0;color:#71717a;width:90px;vertical-align:top;">URL</td><td style="padding:4px 0;color:#a1a1aa;word-break:break-all;">${ctxUrl}</td></tr>` : ""}
        ${ctxPage ? `<tr><td style="padding:4px 0;color:#71717a;vertical-align:top;">Page</td><td style="padding:4px 0;color:#a1a1aa;word-break:break-all;">${ctxPage}</td></tr>` : ""}
        ${ctxUA ? `<tr><td style="padding:4px 0;color:#71717a;vertical-align:top;">User Agent</td><td style="padding:4px 0;color:#71717a;word-break:break-all;font-size:11px;">${ctxUA}</td></tr>` : ""}
      </table>

      ${buttonHtml("Open Admin Queue", `${baseUrl}/admin/moderation`)}
    `);

    const result = await client.emails.send({
      from: fromEmail,
      to: BUG_REPORT_NOTIFY_EMAIL,
      replyTo: report.reporterEmail || undefined,
      subject,
      html,
    });

    if (result.error) {
      console.error("[email] Bug report notify failed:", result.error);
      return;
    }
    console.log("[email] Bug report notification sent, id:", result.data?.id);
  } catch (e: any) {
    console.error("[email] sendBugReportNotification error:", e?.message || e);
  }
}

export async function sendWelcomeEmail(email: string, name: string, baseUrl: string) {
  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: `Welcome to ${BRAND.name}!`,
      html: emailWrapper(`Welcome, ${name}!`, `
        <p style="color: #a1a1aa; line-height: 1.6;">Your creator account is ready. You now have access to 6 creative studios:</p>
        <ul style="color: #a1a1aa; line-height: 2; padding-left: 20px;">
          <li>Comic Creator</li>
          <li>Visual Novel Studio</li>
          <li>CYOA Builder</li>
          <li>Card Creator</li>
          <li>Motion Studio</li>
          <li>Cover Editor</li>
        </ul>
        ${buttonHtml("Start Creating", baseUrl)}
        <p style="color: #71717a; font-size: 12px;">Need help? Check out the Learn module in your dashboard.</p>
      `)
    });
  } catch (err) {
    console.error("[email] Failed to send welcome email:", err);
  }
}

export async function sendAssignmentNotification(
  studentEmail: string,
  studentName: string,
  assignmentTitle: string,
  dueDate: string | null,
  teacherName: string,
  baseUrl: string
) {
  try {
    const { client, fromEmail } = await getResendClient();
    const dueLine = dueDate ? `<p style="color: #fbbf24; font-size: 14px; font-weight: bold;">Due: ${new Date(dueDate).toLocaleDateString()}</p>` : "";

    await client.emails.send({
      from: fromEmail,
      to: studentEmail,
      subject: `New Assignment: ${assignmentTitle}`,
      html: emailWrapper("New Assignment", `
        <p style="color: #a1a1aa; line-height: 1.6;">Hi ${studentName}, your teacher <strong style="color: #fff;">${teacherName}</strong> has posted a new assignment:</p>
        <div style="background: #18181b; border: 2px solid #27272a; padding: 16px; margin: 16px 0;">
          <h3 style="color: #fff; margin: 0 0 8px 0;">${assignmentTitle}</h3>
          ${dueLine}
        </div>
        ${buttonHtml("View Assignment", `${baseUrl}/teacher`)}
      `)
    });
  } catch (err) {
    console.error("[email] Failed to send assignment notification:", err);
  }
}

export async function sendSubmissionConfirmation(
  studentEmail: string,
  studentName: string,
  assignmentTitle: string,
  baseUrl: string
) {
  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: studentEmail,
      subject: `Submitted: ${assignmentTitle}`,
      html: emailWrapper("Submission Confirmed", `
        <p style="color: #a1a1aa; line-height: 1.6;">Hi ${studentName}, your submission for <strong style="color: #fff;">${assignmentTitle}</strong> has been received.</p>
        <p style="color: #a1a1aa; line-height: 1.6;">Your teacher will review and grade it soon.</p>
        ${buttonHtml("View Dashboard", baseUrl)}
      `)
    });
  } catch (err) {
    console.error("[email] Failed to send submission confirmation:", err);
  }
}

export async function sendGradeNotification(
  studentEmail: string,
  studentName: string,
  assignmentTitle: string,
  grade: number,
  feedback: string,
  baseUrl: string
) {
  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: studentEmail,
      subject: `Graded: ${assignmentTitle} — ${grade}/100`,
      html: emailWrapper("Assignment Graded", `
        <p style="color: #a1a1aa; line-height: 1.6;">Hi ${studentName}, your assignment has been graded:</p>
        <div style="background: #18181b; border: 2px solid #27272a; padding: 16px; margin: 16px 0;">
          <h3 style="color: #fff; margin: 0 0 8px 0;">${assignmentTitle}</h3>
          <p style="color: ${BRAND.color}; font-size: 24px; font-weight: 900; margin: 8px 0;">${grade}/100</p>
          ${feedback ? `<p style="color: #a1a1aa; font-size: 14px; margin: 8px 0; border-top: 1px solid #27272a; padding-top: 12px;">${feedback}</p>` : ""}
        </div>
        ${buttonHtml("View Details", baseUrl)}
      `)
    });
  } catch (err) {
    console.error("[email] Failed to send grade notification:", err);
  }
}

export async function sendPurchaseConfirmation(
  buyerEmail: string,
  buyerName: string,
  itemTitle: string,
  amount: number,
  baseUrl: string
) {
  try {
    const { client, fromEmail } = await getResendClient();
    const priceStr = amount > 0 ? `$${(amount / 100).toFixed(2)}` : "Free";

    await client.emails.send({
      from: fromEmail,
      to: buyerEmail,
      subject: `Purchase Confirmed: ${itemTitle}`,
      html: emailWrapper("Purchase Confirmed", `
        <p style="color: #a1a1aa; line-height: 1.6;">Hi ${buyerName}, your purchase has been confirmed:</p>
        <div style="background: #18181b; border: 2px solid #27272a; padding: 16px; margin: 16px 0;">
          <h3 style="color: #fff; margin: 0 0 8px 0;">${itemTitle}</h3>
          <p style="color: ${BRAND.color}; font-size: 18px; font-weight: 900; margin: 8px 0;">${priceStr}</p>
        </div>
        ${buttonHtml("View Purchases", `${baseUrl}/marketplace/purchases`)}
      `)
    });
  } catch (err) {
    console.error("[email] Failed to send purchase confirmation:", err);
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendNewChapterNotification(
  email: string,
  name: string,
  seriesTitle: string,
  chapterTitle: string,
  seriesId: string
) {
  try {
    const { client, fromEmail } = await getResendClient();
    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "https://pscomixx.com";
    const safeName = escapeHtml(name);
    const safeSeriesTitle = escapeHtml(seriesTitle);
    const safeChapterTitle = escapeHtml(chapterTitle);
    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: `New Chapter: ${safeChapterTitle} — ${safeSeriesTitle}`,
      html: emailWrapper(`New Chapter Available`, `
        <p style="color: #a1a1aa; line-height: 1.6;">Hi ${safeName}, a new chapter has been added to a series you follow:</p>
        <div style="background: #18181b; border: 2px solid ${BRAND.color}; padding: 20px; margin: 16px 0;">
          <h3 style="color: #fff; margin: 0 0 4px 0;">${safeSeriesTitle}</h3>
          <p style="color: ${BRAND.color}; font-size: 16px; font-weight: 900; margin: 4px 0 0 0;">${safeChapterTitle}</p>
        </div>
        ${buttonHtml("Read Now", `${baseUrl}/community/series/${seriesId}`)}
      `)
    });
  } catch (err) {
    console.error("[email] Failed to send new chapter notification:", err);
  }
}

export async function sendSubscriptionConfirmation(
  email: string,
  name: string,
  tierName: string,
  baseUrl: string
) {
  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: `Welcome to ${tierName}!`,
      html: emailWrapper(`Upgrade Confirmed: ${tierName}`, `
        <p style="color: #a1a1aa; line-height: 1.6;">Hi ${name}, you're now on the <strong style="color: ${BRAND.color};">${tierName}</strong> plan.</p>
        <p style="color: #a1a1aa; line-height: 1.6;">You now have full access to all premium features. Start creating something amazing.</p>
        ${buttonHtml("Go to Dashboard", baseUrl)}
      `)
    });
  } catch (err) {
    console.error("[email] Failed to send subscription confirmation:", err);
  }
}
