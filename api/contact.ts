import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

// Helper function to escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return (text || '').replace(/[&<>"']/g, (m) => map[m]);
}

// Helper to send email via Resend API or Nodemailer
async function sendEmail({
  from,
  to,
  replyTo,
  subject,
  html,
  text
}: {
  from: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    const toArray = Array.isArray(to) ? to : [to];
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: toArray,
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        html,
        text
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('❌ Resend API contact error:', data);
      throw new Error(data.message || 'Resend API failed');
    }
    return { messageId: data.id };
  }

  // Fallback to Nodemailer
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  if (!smtpUser || !smtpPassword) {
    throw new Error('No email provider configured. Please set RESEND_API_KEY or SMTP credentials.');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: smtpUser, pass: smtpPassword },
    tls: { rejectUnauthorized: false }
  });

  return await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    replyTo,
    subject,
    html,
    text
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { firstName, lastName, email, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['firstName', 'lastName', 'email', 'message']
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const fromEmail = process.env.FROM_EMAIL || 'Open Banque <contact@openbanque.company>';
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'marcavo77@gmail.com';

    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    // 1. Email pour l'administrateur
    const adminSubject = `📩 Nouveau message de contact - ${safeFirstName} ${safeLastName}`;
    const adminHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>${adminSubject}</title></head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 30px; text-align: center;">
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff;">
                      📬 NOUVEAU MESSAGE DE CONTACT
                    </div>
                    <div style="font-size: 13px; color: #a7f3d0; margin-top: 4px;">
                      Formulaire de contact Open Banque
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 30px;">
                    <table role="presentation" style="width: 100%; background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; margin-bottom: 25px; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Expéditeur</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #ffffff; font-weight: 700; text-align: right;">${safeFirstName} ${safeLastName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Email</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #38bdf8; text-align: right;"><a href="mailto:${safeEmail}" style="color: #38bdf8;">${safeEmail}</a></td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px;">Date</td>
                        <td style="padding: 12px 16px; color: #94a3b8; text-align: right;">${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</td>
                      </tr>
                    </table>

                    <div style="background-color: #0f172a; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; padding: 20px; margin-bottom: 25px;">
                      <div style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Message reçu :</div>
                      <div style="color: #f1f5f9; font-size: 14px; line-height: 1.6;">${safeMessage}</div>
                    </div>

                    <div style="background-color: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 12px 16px; color: #a7f3d0; font-size: 12px;">
                      💬 <em>Vous pouvez répondre directement à cet email pour contacter ${safeFirstName} ${safeLastName}.</em>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 15px 30px; text-align: center; color: #64748b; font-size: 11px;">
                    Open Banque • Système de contact sécurisé
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 2. Email de confirmation pour le client
    const clientSubject = `Confirmation de votre demande - Open Banque`;
    const clientHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>${clientSubject}</title></head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 35px 30px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #ffffff;">
                      OPEN BANQUE
                    </div>
                    <div style="font-size: 13px; color: #a7f3d0; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">
                      Service Client
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 35px 30px;">
                    <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 18px; font-weight: 700;">
                      Bonjour ${safeFirstName},
                    </h2>

                    <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                      Nous avons bien reçu votre message et nous vous remercions d'avoir contacté Open Banque.
                    </p>

                    <p style="margin: 0 0 25px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                      Un conseiller dédié examine actuellement votre demande et reviendra vers vous sous <strong>24 heures ouvrées</strong>.
                    </p>

                    <div style="background-color: #0f172a; border-left: 3px solid #10b981; border-radius: 0 8px 8px 0; padding: 18px; margin-bottom: 25px;">
                      <div style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Récapitulatif de votre message :</div>
                      <div style="color: #e2e8f0; font-size: 13px; line-height: 1.5;">${safeMessage}</div>
                    </div>

                    <p style="margin: 0; color: #64748b; font-size: 13px;">
                      Cordialement,<br>
                      <strong style="color: #94a3b8;">L'équipe Relation Client Open Banque</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 20px 30px; text-align: center; color: #64748b; font-size: 11px;">
                    © ${new Date().getFullYear()} Open Banque Corporation • <a href="https://openbanque.company" style="color: #10b981; text-decoration: none;">openbanque.company</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 1. Envoyer à l'administrateur
    const adminInfo = await sendEmail({
      from: fromEmail,
      to: adminEmail,
      replyTo: email,
      subject: adminSubject,
      html: adminHtml,
      text: `Nouveau message de: ${firstName} ${lastName} (${email})\n\nMessage:\n${message}`
    });

    // 2. Envoyer confirmation au visiteur
    try {
      await sendEmail({
        from: fromEmail,
        to: email,
        subject: clientSubject,
        html: clientHtml,
        text: `Bonjour ${firstName},\n\nNous avons bien reçu votre message et un conseiller vous répondra sous 24h.\n\nCordialement,\nL'équipe Open Banque`
      });
    } catch (err: any) {
      console.warn('⚠️ Erreur envoi confirmation client (non bloquant):', err.message);
    }

    return res.status(200).json({ 
      success: true,
      messageId: adminInfo.messageId,
      message: 'Message transmis avec succès'
    });

  } catch (error: any) {
    console.error('Error in contact API:', error);
    return res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message
    });
  }
}
