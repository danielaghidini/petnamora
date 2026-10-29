import { z } from "zod";
import { HttpError } from "./http";

const unavailable = "Não foi possível enviar as instruções agora. Tente novamente em alguns minutos.";

export function passwordResetEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const configuredUrl = process.env.APP_URL?.trim();
  if (!apiKey || !from || !z.email().safeParse(from).success || !configuredUrl)
    throw new HttpError(unavailable, 503);
  let url: URL;
  try { url = new URL(configuredUrl); } catch { throw new HttpError(unavailable, 503); }
  if (url.username || url.password || (url.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && url.protocol === "http:")))
    throw new HttpError(unavailable, 503);
  return { apiKey, from, origin: url.origin };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export async function sendPasswordResetEmail(
  config: ReturnType<typeof passwordResetEmailConfig>, email: string, token: string,
) {
  const resetUrl = new URL("/reset-password", config.origin);
  resetUrl.searchParams.set("resetToken", token);
  const link = escapeHtml(resetUrl.toString());
  const logo = escapeHtml(new URL("/brand/petnamora-logo-02.png", config.origin).toString());
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        from: `Pet Namora <${config.from}>`,
        to: [email],
        subject: "Recuperar sua senha — Pet Namora",
        text: `Recebemos um pedido para trocar a senha da sua conta no Pet Namora.\n\nCrie sua nova senha: ${resetUrl}\n\nO link vale por 1 hora e só pode ser usado uma vez. Se você não fez esse pedido, ignore este e-mail. Sua senha continua a mesma.`,
        html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#faf9fc;font-family:Arial,Helvetica,sans-serif;color:#30293d">
<div style="max-width:560px;margin:auto;background:#fff;border:1px solid #eeeaf1;border-radius:16px;overflow:hidden">
<div style="padding:32px;text-align:center;border-bottom:1px solid #eeeaf1"><img src="${logo}" alt="Pet Namora" width="220" style="max-width:100%;height:auto"></div>
<div style="padding:32px;line-height:1.7"><h1 style="font-size:24px;color:#4a2877;margin:0 0 20px">Vamos criar uma nova senha?</h1>
<p>Recebemos um pedido para trocar a senha da sua conta no Pet Namora.</p><p>Toque no botão para criar uma nova senha e voltar aos papos da família:</p>
<p style="text-align:center;margin:28px 0"><a href="${link}" style="display:inline-block;background:#ec477e;color:#fff;padding:14px 24px;border-radius:8px;font-weight:bold;text-decoration:none">Criar nova senha</a></p>
<p>O link vale por <strong>1 hora</strong> e só pode ser usado uma vez.</p><p style="font-size:14px;color:#83718f">Se você não fez esse pedido, ignore este e-mail. Sua senha continua a mesma.</p>
<p style="font-size:13px;color:#83718f">Se o botão não abrir, copie este endereço no navegador:<br><a href="${link}" style="color:#cf2c64;word-break:break-all">${link}</a></p></div></div></body></html>`,
      }),
    });
    // Acceptance by Resend is required; a missing key or provider failure must
    // never look like successful delivery. Do not log addresses or reset links.
    const result = await response.json();
    if (!response.ok || !z.object({ id: z.string().min(1) }).safeParse(result).success)
      throw new Error("Email provider did not accept the message");
  } catch {
    console.error("Pet Namora password recovery: email provider unavailable");
    throw new HttpError(unavailable, 503);
  }
}
