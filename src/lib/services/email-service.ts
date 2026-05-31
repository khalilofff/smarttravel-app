interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

type Provider = "resend" | "smtp";

function getAppUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function getEmailFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "SmartTravel <onboarding@resend.dev>"
  );
}

function isRealValue(value?: string) {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  return ![
    "your_smarttravel_email@gmail.com",
    "your_google_app_password",
    "your_password",
    "changeme",
  ].includes(v);
}

function configuredProvider(): Provider {
  if (isRealValue(process.env.RESEND_API_KEY)) return "resend";
  if (isRealValue(process.env.SMTP_HOST) && isRealValue(process.env.SMTP_USER) && isRealValue(process.env.SMTP_PASS)) return "smtp";
  throw new Error(
    "Email service is not configured. Add RESEND_API_KEY and EMAIL_FROM to .env.local, or configure SMTP settings."
  );
}

async function sendWithResend(options: EmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is missing from .env.local.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!response.ok) {
    let message = "Resend email request failed.";
    try {
      const data = await response.json();
      message = data?.message || data?.error?.message || data?.error || message;
    } catch {
      // keep generic message
    }
    throw new Error(message);
  }
}

async function sendWithSmtp(options: EmailOptions) {
  const nodemailer = await import("nodemailer");
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP settings are incomplete in .env.local.");
  }

  const transporter = nodemailer.default.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: getEmailFrom(),
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const provider = configuredProvider();
  if (provider === "resend") await sendWithResend(options);
  else await sendWithSmtp(options);
  return true;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: email,
    subject: "Reset Your SmartTravel Password",
    text: `Reset your SmartTravel password: ${resetUrl}. This link expires in 30 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:auto;">
        <h2>Reset your SmartTravel password</h2>
        <p>Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
        <p><a href="${resetUrl}" style="background:#2563eb;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Reset password</a></p>
        <p style="font-size:13px;color:#6b7280;">Or copy this link: ${resetUrl}</p>
        <p style="font-size:13px;color:#6b7280;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(email: string, token: string, appUrl?: string) {
  const baseUrl = appUrl || getAppUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  return sendEmail({
    to: email,
    subject: "Verify your SmartTravel account",
    text: `Verify your SmartTravel account: ${verifyUrl}. This link expires in 24 hours.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:auto;">
        <h2>Verify your SmartTravel account</h2>
        <p>Welcome to SmartTravel. Click the button below to verify your email address.</p>
        <p><a href="${verifyUrl}" style="background:#2563eb;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Verify email</a></p>
        <p style="font-size:13px;color:#6b7280;">This link expires in 24 hours.</p>
        <p style="font-size:13px;color:#6b7280;">Or copy this link: ${verifyUrl}</p>
      </div>
    `,
  });
}

export async function sendTripInviteEmail(email: string, tripTitle: string, inviterName: string) {
  const loginUrl = `${getAppUrl()}/login`;
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to collaborate on "${tripTitle}"`,
    text: `${inviterName} invited you to collaborate on "${tripTitle}". Log in to accept: ${loginUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:auto;">
        <h2>Trip collaboration invitation</h2>
        <p><strong>${inviterName}</strong> invited you to collaborate on <strong>${tripTitle}</strong>.</p>
        <p><a href="${loginUrl}" style="background:#2563eb;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Open SmartTravel</a></p>
      </div>
    `,
  });
}
