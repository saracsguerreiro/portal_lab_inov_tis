// Email por SMTP configurável (Mailpit em desenvolvimento, Office 365 ou outro em produção).
import nodemailer from "nodemailer";

let transport: nodemailer.Transporter | null = null;
const tx = () =>
  (transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  }));

export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const body = text.replace(/(^|\s)(\/[\w/?=.&-]+)/g, (_, s, path) => `${s}${base}${path}`);
  await tx().sendMail({
    from: process.env.SMTP_FROM ?? "Ecossistema de Inovação TIS <inovacao@tis.example>",
    to,
    subject,
    text: `${body}\n\n—\nEcossistema de Inovação TIS. Pode mudar as preferências de notificação no seu perfil.`,
  });
}
