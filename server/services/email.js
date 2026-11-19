import nodemailer from "nodemailer";

const smtpSettings = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new Error("Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.");
  }
  return { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM };
};

const sendEmail = async ({ to, subject, text }) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = smtpSettings();
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  await transport.sendMail({ from: SMTP_FROM, to, subject, text });
};

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  await sendEmail({ to, subject: "Reset your FinTrack AI password", text: `Hi ${name},\n\nUse this secure link to reset your password. It expires in 30 minutes:\n${resetUrl}\n\nIf you didn’t ask to reset your password, you can ignore this email.` });
}

export async function sendVerificationEmail({ to, name, verificationUrl }) {
  await sendEmail({ to, subject: "Verify your FinTrack AI email", text: `Hi ${name},\n\nConfirm your email address to activate your FinTrack account:\n${verificationUrl}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.` });
}
