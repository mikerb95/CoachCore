/**
 * Envío de email mínimo vía Resend (sin SDK, solo fetch).
 * Si RESEND_API_KEY no está configurada, hace fallback a consola (dev),
 * de modo que el flujo de recuperación funciona en local sin proveedor.
 */
type SendArgs = { to: string; subject: string; html: string };

export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "CoachCore <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY no configurada. Email a ${to} no enviado.\n` + `Asunto: ${subject}\n${html}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] Resend falló (${res.status}): ${body}`);
    throw new Error("No se pudo enviar el email");
  }
}
