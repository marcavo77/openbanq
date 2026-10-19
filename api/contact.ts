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

// 11 languages translations for the contact confirmation email to the client
const CONTACT_CONFIRMATION_TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    subject: 'Confirmation de votre demande - Open Banque',
    badge: 'Service Client',
    greeting: 'Bonjour',
    message1: 'Nous avons bien reçu votre message et nous vous remercions d\'avoir contacté Open Banque.',
    message2: 'Un conseiller dédié examine actuellement votre demande et reviendra vers vous sous <strong>24 heures ouvrées</strong>.',
    summaryTitle: 'Récapitulatif de votre message :',
    footer: 'Cordialement,',
    footerTeam: 'L\'équipe Relation Client Open Banque',
    footerNote: 'Ce message automatique confirme la bonne réception de votre demande.'
  },
  en: {
    subject: 'Confirmation of your request - Open Banque',
    badge: 'Customer Support',
    greeting: 'Hello',
    message1: 'We have received your message and thank you for reaching out to Open Banque.',
    message2: 'A dedicated representative is reviewing your request and will get back to you within <strong>24 business hours</strong>.',
    summaryTitle: 'Summary of your message:',
    footer: 'Best regards,',
    footerTeam: 'The Open Banque Support Team',
    footerNote: 'This automated email confirms receipt of your inquiry.'
  },
  nl: {
    subject: 'Bevestiging van uw aanvraag - Open Banque',
    badge: 'Klantenservice',
    greeting: 'Hallo',
    message1: 'Wij hebben uw bericht ontvangen en danken u voor uw contact met Open Banque.',
    message2: 'Een adviseur beoordeelt momenteel uw verzoek en zal binnen <strong>24 werkuren</strong> reageren.',
    summaryTitle: 'Samenvatting van uw bericht:',
    footer: 'Met vriendelijke groet,',
    footerTeam: 'Het Open Banque Klantenserviceteam',
    footerNote: 'Deze automatische e-mail bevestigt de ontvangst van uw aanvraag.'
  },
  de: {
    subject: 'Bestätigung Ihrer Anfrage - Open Banque',
    badge: 'Kundenservice',
    greeting: 'Hallo',
    message1: 'Wir haben Ihre Nachricht erhalten und danken Ihnen für Ihre Kontaktaufnahme mit Open Banque.',
    message2: 'Ein Kundenberater prüft derzeit Ihr Anliegen und wird sich innerhalb von <strong>24 Geschäftsstunden</strong> bei Ihnen melden.',
    summaryTitle: 'Zusammenfassung Ihrer Nachricht:',
    footer: 'Mit freundlichen Grüßen,',
    footerTeam: 'Ihr Open Banque Kundenservice',
    footerNote: 'Diese automatische E-Mail bestätigt den Eingang Ihrer Anfrage.'
  },
  es: {
    subject: 'Confirmación de su solicitud - Open Banque',
    badge: 'Atención al Cliente',
    greeting: 'Hola',
    message1: 'Hemos recibido su mensaje y le agradecemos por ponerse en contacto con Open Banque.',
    message2: 'Un asesor especializado está revisando su solicitud y se comunicará con usted en un plazo de <strong>24 horas hábiles</strong>.',
    summaryTitle: 'Resumen de su mensaje:',
    footer: 'Atentamente,',
    footerTeam: 'El equipo de Atención al Cliente Open Banque',
    footerNote: 'Este correo electrónico automático confirma la recepción de su solicitud.'
  },
  it: {
    subject: 'Conferma della tua richiesta - Open Banque',
    badge: 'Servizio Clienti',
    greeting: 'Ciao',
    message1: 'Abbiamo ricevuto il tuo messaggio e ti ringraziamo per aver contattato Open Banque.',
    message2: 'Un consulente dedicato sta esaminando la tua richiesta e ti risponderà entro <strong>24 ore lavorative</strong>.',
    summaryTitle: 'Riepilogo del tuo messaggio:',
    footer: 'Cordiali saluti,',
    footerTeam: 'Il team Servizio Clienti Open Banque',
    footerNote: 'Questa email automatica conferma la ricezione della tua richiesta.'
  },
  pt: {
    subject: 'Confirmação da sua solicitação - Open Banque',
    badge: 'Apoio ao Cliente',
    greeting: 'Olá',
    message1: 'Recebemos a sua mensagem e agradecemos o seu contacto com o Open Banque.',
    message2: 'Um gestor dedicado está a analisar o seu pedido e responderá dentro de <strong>24 horas úteis</strong>.',
    summaryTitle: 'Resumo da sua mensagem:',
    footer: 'Atenciosamente,',
    footerTeam: 'A equipa de Apoio ao Cliente Open Banque',
    footerNote: 'Este e-mail automático confirma a receção do seu pedido.'
  },
  ru: {
    subject: 'Подтверждение вашего обращения - Open Banque',
    badge: 'Служба поддержки',
    greeting: 'Здравствуйте',
    message1: 'Мы получили ваше сообщение и благодарим вас за обращение в Open Banque.',
    message2: 'Специалист уже рассматривает ваш запрос и свяжется с вами в течение <strong>24 рабочих часов</strong>.',
    summaryTitle: 'Краткое содержание вашего сообщения:',
    footer: 'С уважением,',
    footerTeam: 'Служба поддержки клиентов Open Banque',
    footerNote: 'Это автоматическое письмо подтверждает получение вашего обращения.'
  },
  zh: {
    subject: '已收到您的咨询申请 - Open Banque',
    badge: '客户服务',
    greeting: '您好',
    message1: '我们已成功收到您的留言，感谢您联系 Open Banque。',
    message2: '专属客户顾问正在处理您的咨询，并将在 <strong>24 个工作小时</strong> 内给您答复。',
    summaryTitle: '您的留言内容：',
    footer: '此致，',
    footerTeam: 'Open Banque 客户关系团队',
    footerNote: '此自动邮件确认已收到您的咨询请求。'
  },
  ja: {
    subject: 'お問い合わせ受付の確認 - Open Banque',
    badge: 'カスタマーサポート',
    greeting: 'こんにちは',
    message1: 'お問い合わせいただきありがとうございます。メッセージを受領いたしました。',
    message2: '専任スタッフが確認の上、<strong>24営業時間以内</strong>にご返信いたします。',
    summaryTitle: 'お問い合わせ内容：',
    footer: '敬具',
    footerTeam: 'Open Banque カスタマーサポートチーム',
    footerNote: 'このメールはお問い合わせ受付の自動確認通知です。'
  },
  ar: {
    subject: 'تأكيد استلام رسالتك - Open Banque',
    badge: 'خدمة العملاء',
    greeting: 'مرحباً',
    message1: 'لقد استلمنا رسالتك بنجاح ونشكرك على تواصلك مع Open Banque.',
    message2: 'يقوم مستشار مخصص حالياً بمراجعة طلبك وسيقوم بالرد عليك في غضون <strong>24 ساعة عمل</strong>.',
    summaryTitle: 'ملخص رسالتك:',
    footer: 'مع خالص التحيات،',
    footerTeam: 'فريق علاقات العملاء في Open Banque',
    footerNote: 'هذا البريد الآلي يؤكد استلام رسالتك بنجاح.'
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
    const { firstName, lastName, email, message, language = 'fr' } = req.body;

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

    const langKey = typeof language === 'string' ? language.toLowerCase() : 'fr';
    const t = CONTACT_CONFIRMATION_TRANSLATIONS[langKey] || CONTACT_CONFIRMATION_TRANSLATIONS['fr'];

    const fromEmail = process.env.FROM_EMAIL || 'Open Banque <contact@openbanque.company>';
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'contact@openbanque.company';

    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    // Dynamic sender for Admin alert so Zoho Mail displays "Prénom Nom (Contact Web)" instead of "Me"
    const contactAdminSender = `${safeFirstName} ${safeLastName} (Contact Web) <contact-form@openbanque.company>`;

    // 1. Email pour l'administrateur
    const adminSubject = `📬 [CONTACT WEB] Nouveau message de ${safeFirstName} ${safeLastName}`;
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

    // 2. Email de confirmation pour le client (traduit dans sa langue)
    const clientSubject = t.subject;
    const clientHtml = `
      <!DOCTYPE html>
      <html lang="${langKey}">
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
                      ${t.badge}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 35px 30px;">
                    <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 18px; font-weight: 700;">
                      ${t.greeting} ${safeFirstName},
                    </h2>

                    <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                      ${t.message1}
                    </p>

                    <p style="margin: 0 0 25px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                      ${t.message2}
                    </p>

                    <div style="background-color: #0f172a; border-left: 3px solid #10b981; border-radius: 0 8px 8px 0; padding: 18px; margin-bottom: 25px;">
                      <div style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">${t.summaryTitle}</div>
                      <div style="color: #e2e8f0; font-size: 13px; line-height: 1.5;">${safeMessage}</div>
                    </div>

                    <p style="margin: 0; color: #64748b; font-size: 13px;">
                      ${t.footer}<br>
                      <strong style="color: #94a3b8;">${t.footerTeam}</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 20px 30px; text-align: center; color: #64748b; font-size: 11px;">
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

    // 1. Envoyer à l'administrateur avec expéditeur spécifique pour Zoho Mail
    const adminInfo = await sendEmail({
      from: contactAdminSender,
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
        text: `${t.greeting} ${firstName},\n\n${t.message1}\n\n${t.footer}\n${t.footerTeam}`
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
