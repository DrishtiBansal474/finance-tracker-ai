import nodemailer from "nodemailer";

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new Error("Password reset email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.");
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject: "Reset your FinTrack AI password",
    text: `Hi ${name},\n\nUse this secure link to reset your password. It expires in 30 minutes:\n${resetUrl}\n\nIf you didn’t ask to reset your password, you can ignore this email.`,
  });
}
