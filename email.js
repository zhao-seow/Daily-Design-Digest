import nodemailer from 'nodemailer';

/**
 * Send a plain-text digest notification via Gmail.
 * Requires in environment: GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_EMAIL
 */
export async function sendNotification(items, issue) {
  const user     = process.env.GMAIL_USER;
  const pass     = process.env.GMAIL_APP_PASSWORD;
  const to       = process.env.NOTIFY_EMAIL;
  const siteUrl  = 'https://zhao-seow.github.io/Daily-Design-Digest/';

  if (!user || !pass || !to) {
    console.warn('  Email skipped — GMAIL_USER, GMAIL_APP_PASSWORD or NOTIFY_EMAIL not set');
    return;
  }

  const issueLabel = `#${String(issue).padStart(3, '0')}`;

  // Build plain-text body grouped by section
  const sections = ['hero', 'spotlight', 'sidebar'];
  const lines = [];

  for (const section of sections) {
    const group = items.filter(i => i.section === section);
    if (!group.length) continue;
    lines.push(`${section.toUpperCase()}`);
    for (const item of group) {
      lines.push(`  — ${item.title}`);
    }
    lines.push('');
  }

  const body = [
    `Design × AI Digest — Issue ${issueLabel}`,
    '─'.repeat(40),
    '',
    ...lines,
    `Read the full issue: ${siteUrl}`,
  ].join('\n');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  await transporter.sendMail({
    from:    `"Design × AI Digest" <${user}>`,
    to,
    subject: `Design × AI Digest — Issue ${issueLabel} is live`,
    text:    body,
  });

  console.log(`  Email sent to ${to}`);
}
