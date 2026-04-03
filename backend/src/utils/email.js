import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    : undefined
});

export async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER) {
    console.log("[Email][DEV]", { to, subject, html });
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || "no-reply@cosmicbeauty.local",
    to,
    subject,
    html
  });
}
