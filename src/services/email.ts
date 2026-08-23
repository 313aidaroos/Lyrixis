import nodemailer from "nodemailer";
import { IntelligencePackage } from "@/types";

export async function sendResultsEmail(
  to: string,
  pkg: IntelligencePackage
): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  if (!host || !user || !pass) {
    console.log(
      `[email] SMTP not configured. Results ready for ${to}: ${appUrl}/tracks/${pkg.publicId}`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  const resultsUrl = `${appUrl}/tracks/${pkg.publicId}`;

  await transporter.sendMail({
    from: process.env.SUPPORT_EMAIL || "Lyrixis@Apixis.dev",
    to,
    subject: `Lyrixis results ready — ${pkg.title}`,
    text: [
      `Your track "${pkg.title}" by ${pkg.artist} has been processed.`,
      ``,
      `Status: ${pkg.status}`,
      `Language: ${pkg.language} (${pkg.confidenceBand} confidence)`,
      `Lines: ${pkg.lyrics.length}`,
      ``,
      `View and download exports: ${resultsUrl}`,
      ``,
      `Formats available: JSON, SRT, LRC, TXT, MEAD (DDEX-compatible enrichment)`,
      ``,
      `— Lyrixis`,
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#111">
        <h2>Your track is ready</h2>
        <p><strong>${pkg.title}</strong> by ${pkg.artist}</p>
        <p>Status: ${pkg.status}<br>
        Language: ${pkg.language} (${pkg.confidenceBand})<br>
        Lines transcribed: ${pkg.lyrics.length}</p>
        <p><a href="${resultsUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(90deg,#A855F7,#EC4899);color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View results &amp; download</a></p>
        <p style="color:#666;font-size:14px">Exports: JSON · SRT · LRC · TXT · MEAD</p>
      </div>
    `,
  });
}
