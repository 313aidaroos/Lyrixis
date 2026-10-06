/**
 * Same sender the support form uses (Resend). If the key is missing or the send fails,
 * the caller still keeps the database row. This file never talks to Stripe.
 */
export async function sendLyrixisEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
}): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false };
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Lyrixis <lyrixis@apixis.dev>",
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { sent: !result.error };
  } catch {
    return { sent: false };
  }
}
