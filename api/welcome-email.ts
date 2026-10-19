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
  return text.replace(/[&<>"']/g, (m) => map[m]);
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
      console.error('❌ Resend API welcome error:', data);
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

// Translations for welcome email (to be replaced with translations.ts import if needed)
const WELCOME_EMAIL_TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    subject: 'Bienvenue chez Open Banque - Votre compte a été créé avec succès',
    greeting: 'Bonjour',
    title: 'Bienvenue chez Open Banque !',
    message1: 'Félicitations ! Votre compte Open Banque a été créé avec succès.',
    message2: 'Vous pouvez maintenant accéder à votre espace client et profiter de tous nos services bancaires innovants.',
    message3: 'Voici quelques informations importantes concernant votre compte :',
    accountCreated: 'Votre compte a été créé avec succès',
    nextSteps: 'Prochaines étapes',
    nextStepsDesc: 'Connectez-vous à votre compte pour commencer à utiliser nos services.',
    loginButton: 'Se connecter',
    support: 'Besoin d\'aide ?',
    supportDesc: 'Notre équipe est là pour vous accompagner. N\'hésitez pas à nous contacter si vous avez des questions.',
    footer: 'Cordialement,',
    footerTeam: 'L\'équipe Open Banque',
    footerNote: 'Cet email a été envoyé automatiquement. Veuillez ne pas répondre à cet email.'
  },
  en: {
    subject: 'Welcome to Open Banque - Your account has been successfully created',
    greeting: 'Hello',
    title: 'Welcome to Open Banque!',
    message1: 'Congratulations! Your Open Banque account has been successfully created.',
    message2: 'You can now access your client area and enjoy all our innovative banking services.',
    message3: 'Here are some important information about your account:',
    accountCreated: 'Your account has been successfully created',
    nextSteps: 'Next Steps',
    nextStepsDesc: 'Log in to your account to start using our services.',
    loginButton: 'Log in',
    support: 'Need Help?',
    supportDesc: 'Our team is here to assist you. Feel free to contact us if you have any questions.',
    footer: 'Best regards,',
    footerTeam: 'The Open Banque Team',
    footerNote: 'This email was sent automatically. Please do not reply to this email.'
  },
  es: {
    subject: 'Bienvenido a Open Banque - Su cuenta ha sido creada con éxito',
    greeting: 'Hola',
    title: '¡Bienvenido a Open Banque!',
    message1: '¡Felicitaciones! Su cuenta de Open Banque ha sido creada con éxito.',
    message2: 'Ahora puede acceder a su área de cliente y disfrutar de todos nuestros servicios bancarios innovadores.',
    message3: 'Aquí hay información importante sobre su cuenta:',
    accountCreated: 'Su cuenta ha sido creada con éxito',
    nextSteps: 'Próximos pasos',
    nextStepsDesc: 'Inicie sesión en su cuenta para comenzar a usar nuestros servicios.',
    loginButton: 'Iniciar sesión',
    support: '¿Necesita ayuda?',
    supportDesc: 'Nuestro equipo está aquí para ayudarle. No dude en contactarnos si tiene alguna pregunta.',
    footer: 'Saludos cordiales,',
    footerTeam: 'El equipo de Open Banque',
    footerNote: 'Este correo electrónico fue enviado automáticamente. Por favor, no responda a este correo.'
  },
  de: {
    subject: 'Willkommen bei Open Banque - Ihr Konto wurde erfolgreich erstellt',
    greeting: 'Hallo',
    title: 'Willkommen bei Open Banque!',
    message1: 'Herzlichen Glückwunsch! Ihr Open Banque-Konto wurde erfolgreich erstellt.',
    message2: 'Sie können jetzt auf Ihren Kundenbereich zugreifen und alle unsere innovativen Bankdienstleistungen nutzen.',
    message3: 'Hier sind wichtige Informationen zu Ihrem Konto:',
    accountCreated: 'Ihr Konto wurde erfolgreich erstellt',
    nextSteps: 'Nächste Schritte',
    nextStepsDesc: 'Melden Sie sich in Ihrem Konto an, um unsere Dienstleistungen zu nutzen.',
    loginButton: 'Anmelden',
    support: 'Brauchen Sie Hilfe?',
    supportDesc: 'Unser Team steht Ihnen zur Verfügung. Kontaktieren Sie uns gerne, wenn Sie Fragen haben.',
    footer: 'Mit freundlichen Grüßen,',
    footerTeam: 'Das Open Banque Team',
    footerNote: 'Diese E-Mail wurde automatisch gesendet. Bitte antworten Sie nicht auf diese E-Mail.'
  },
  it: {
    subject: 'Benvenuto in Open Banque - Il tuo account è stato creato con successo',
    greeting: 'Ciao',
    title: 'Benvenuto in Open Banque!',
    message1: 'Congratulazioni! Il tuo account Open Banque è stato creato con successo.',
    message2: 'Ora puoi accedere alla tua area clienti e godere di tutti i nostri servizi bancari innovativi.',
    message3: 'Ecco alcune informazioni importanti sul tuo account:',
    accountCreated: 'Il tuo account è stato creato con successo',
    nextSteps: 'Prossimi passi',
    nextStepsDesc: 'Accedi al tuo account per iniziare a utilizzare i nostri servizi.',
    loginButton: 'Accedi',
    support: 'Hai bisogno di aiuto?',
    supportDesc: 'Il nostro team è qui per assisterti. Non esitare a contattarci se hai domande.',
    footer: 'Cordiali saluti,',
    footerTeam: 'Il team Open Banque',
    footerNote: 'Questa email è stata inviata automaticamente. Si prega di non rispondere a questa email.'
  },
  pt: {
    subject: 'Bem-vindo ao Open Banque - Sua conta foi criada com sucesso',
    greeting: 'Olá',
    title: 'Bem-vindo ao Open Banque!',
    message1: 'Parabéns! Sua conta Open Banque foi criada com sucesso.',
    message2: 'Agora você pode acessar sua área de cliente e desfrutar de todos os nossos serviços bancários inovadores.',
    message3: 'Aqui estão algumas informações importantes sobre sua conta:',
    accountCreated: 'Sua conta foi criada com sucesso',
    nextSteps: 'Próximos passos',
    nextStepsDesc: 'Faça login em sua conta para começar a usar nossos serviços.',
    loginButton: 'Fazer login',
    support: 'Precisa de ajuda?',
    supportDesc: 'Nossa equipe está aqui para ajudá-lo. Sinta-se à vontade para nos contatar se tiver alguma dúvida.',
    footer: 'Atenciosamente,',
    footerTeam: 'A equipe Open Banque',
    footerNote: 'Este e-mail foi enviado automaticamente. Por favor, não responda a este e-mail.'
  },
  nl: {
    subject: 'Welkom bij Open Banque - Uw account is succesvol aangemaakt',
    greeting: 'Hallo',
    title: 'Welkom bij Open Banque!',
    message1: 'Gefeliciteerd! Uw Open Banque-account is succesvol aangemaakt.',
    message2: 'U kunt nu toegang krijgen tot uw klantenruimte en genieten van al onze innovatieve bankdiensten.',
    message3: 'Hier is belangrijke informatie over uw account:',
    accountCreated: 'Uw account is succesvol aangemaakt',
    nextSteps: 'Volgende stappen',
    nextStepsDesc: 'Log in op uw account om onze diensten te gebruiken.',
    loginButton: 'Inloggen',
    support: 'Hulp nodig?',
    supportDesc: 'Ons team staat klaar om u te helpen. Neem gerust contact met ons op als u vragen heeft.',
    footer: 'Met vriendelijke groet,',
    footerTeam: 'Het Open Banque Team',
    footerNote: 'Deze e-mail is automatisch verzonden. Gelieve niet te antwoorden op deze e-mail.'
  },
  ru: {
    subject: 'Добро пожаловать в Open Banque - Ваш счет успешно создан',
    greeting: 'Здравствуйте',
    title: 'Добро пожаловать в Open Banque!',
    message1: 'Поздравляем! Ваш счет Open Banque успешно создан.',
    message2: 'Теперь вы можете получить доступ к своей клиентской зоне и пользоваться всеми нашими инновационными банковскими услугами.',
    message3: 'Вот важная информация о вашем счете:',
    accountCreated: 'Ваш счет успешно создан',
    nextSteps: 'Следующие шаги',
    nextStepsDesc: 'Войдите в свой аккаунт, чтобы начать пользоваться нашими услугами.',
    loginButton: 'Войти',
    support: 'Нужна помощь?',
    supportDesc: 'Наша команда готова помочь вам. Не стесняйтесь обращаться к нам, если у вас есть вопросы.',
    footer: 'С уважением,',
    footerTeam: 'Команда Open Banque',
    footerNote: 'Это письмо было отправлено автоматически. Пожалуйста, не отвечайте на это письмо.'
  },
  zh: {
    subject: '欢迎加入 Open Banque - 您的账户已成功创建',
    greeting: '您好',
    title: '欢迎加入 Open Banque！',
    message1: '恭喜！您的 Open Banque 账户已成功创建。',
    message2: '您现在可以访问您的客户区域并享受我们所有创新的银行服务。',
    message3: '以下是您账户的重要信息：',
    accountCreated: '您的账户已成功创建',
    nextSteps: '下一步',
    nextStepsDesc: '登录您的账户以开始使用我们的服务。',
    loginButton: '登录',
    support: '需要帮助？',
    supportDesc: '我们的团队随时为您提供帮助。如果您有任何问题，请随时与我们联系。',
    footer: '此致敬礼，',
    footerTeam: 'Open Banque 团队',
    footerNote: '此邮件是自动发送的。请不要回复此邮件。'
  },
  ja: {
    subject: 'Open Banqueへようこそ - アカウントが正常に作成されました',
    greeting: 'こんにちは',
    title: 'Open Banqueへようこそ！',
    message1: 'おめでとうございます！Open Banqueアカウントが正常に作成されました。',
    message2: 'これで、クライアントエリアにアクセスし、革新的な銀行サービスをすべて利用できます。',
    message3: 'アカウントに関する重要な情報は以下のとおりです：',
    accountCreated: 'アカウントが正常に作成されました',
    nextSteps: '次のステップ',
    nextStepsDesc: 'アカウントにログインして、サービスを利用し始めてください。',
    loginButton: 'ログイン',
    support: 'サポートが必要ですか？',
    supportDesc: '私たちのチームがサポートいたします。ご質問がございましたら、お気軽にお問い合わせください。',
    footer: '敬具、',
    footerTeam: 'Open Banqueチーム',
    footerNote: 'このメールは自動送信されました。このメールに返信しないでください。'
  },
  ar: {
    subject: 'مرحباً بك في Open Banque - تم إنشاء حسابك بنجاح',
    greeting: 'مرحباً',
    title: 'مرحباً بك في Open Banque!',
    message1: 'تهانينا! تم إنشاء حساب Open Banque الخاص بك بنجاح.',
    message2: 'يمكنك الآن الوصول إلى مساحة العميل والاستمتاع بجميع خدماتنا المصرفية المبتكرة.',
    message3: 'إليك بعض المعلومات المهمة حول حسابك:',
    accountCreated: 'تم إنشاء حسابك بنجاح',
    nextSteps: 'الخطوات التالية',
    nextStepsDesc: 'قم بتسجيل الدخول إلى حسابك لبدء استخدام خدماتنا.',
    loginButton: 'تسجيل الدخول',
    support: 'تحتاج إلى مساعدة؟',
    supportDesc: 'فريقنا هنا لمساعدتك. لا تتردد في الاتصال بنا إذا كان لديك أي أسئلة.',
    footer: 'مع أطيب التحيات،',
    footerTeam: 'فريق Open Banque',
    footerNote: 'تم إرسال هذا البريد الإلكتروني تلقائياً. يرجى عدم الرد على هذا البريد الإلكتروني.'
  }
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, language = 'fr' } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get translations (default to French if language not found)
    const langKey = typeof language === 'string' ? language.toLowerCase() : 'fr';
    const t = WELCOME_EMAIL_TRANSLATIONS[langKey] || WELCOME_EMAIL_TRANSLATIONS['fr'];

    const fromEmail = process.env.FROM_EMAIL || 'Open Banque <contact@openbanque.company>';
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'contact@openbanque.company';

    // Escape user input to prevent XSS
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);

    const clientHtml = `
      <!DOCTYPE html>
      <html lang="${langKey}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px; text-align: center;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">${t.title}</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                      ${t.greeting} ${safeName},
                    </p>
                    
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      ${t.message1}
                    </p>
                    
                    <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      ${t.message2}
                    </p>
                    
                    <!-- Account Created Box -->
                    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 30px 0;">
                      <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: 600;">
                        ✓ ${t.accountCreated}
                      </p>
                    </div>
                    
                    <!-- Next Steps -->
                    <div style="margin: 30px 0;">
                      <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px; font-weight: 600;">
                        ${t.nextSteps}
                      </h2>
                      <p style="margin: 0 0 25px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        ${t.nextStepsDesc}
                      </p>
                      <a href="https://openbanque.company" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        ${t.loginButton}
                      </a>
                    </div>
                    
                    <!-- Support Section -->
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                        ${t.support}
                      </h3>
                      <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                        ${t.supportDesc}
                      </p>
                    </div>
                    
                    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      ${t.footer}<br>
                      <strong>${t.footerTeam}</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                      ${t.footerNote}
                    </p>
                    <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                      Open Banque - Votre banque de demain
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 1. Send welcome email to user
    const userSend = await sendEmail({
      from: fromEmail,
      to: email,
      subject: t.subject,
      html: clientHtml,
      text: `${t.greeting} ${safeName},\n\n${t.message1}\n\n${t.message2}\n\n${t.footer}\n${t.footerTeam}`
    });

    // 2. Alert admin of new user registration (Zoho sender: "Nouvel Utilisateur")
    try {
      await sendEmail({
        from: 'Nouvel Utilisateur <inscription@openbanque.company>',
        to: adminEmail,
        subject: `👤 [NOUVELLE INSCRIPTION] ${safeName} (${safeEmail})`,
        html: `
          <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 25px; border-radius: 12px;">
            <h2 style="color: #34d399; margin-top: 0;">👤 Nouvelle Inscription Client</h2>
            <p>Un nouvel utilisateur vient de créer un compte sur Open Banque :</p>
            <ul>
              <li><strong>Nom :</strong> ${safeName}</li>
              <li><strong>Email :</strong> <a href="mailto:${safeEmail}" style="color: #38bdf8;">${safeEmail}</a></li>
              <li><strong>Langue choisie :</strong> ${langKey.toUpperCase()}</li>
              <li><strong>Date :</strong> ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</li>
            </ul>
          </div>
        `,
        text: `Nouvelle inscription sur Open Banque:\nNom: ${safeName}\nEmail: ${safeEmail}\nLangue: ${langKey}`
      });
    } catch (adminErr: any) {
      console.warn('⚠️ Admin notification for new registration skipped:', adminErr.message);
    }

    return res.status(200).json({ 
      success: true,
      messageId: userSend.messageId,
      message: 'Welcome email sent successfully'
    });

  } catch (error: any) {
    console.error('Error sending welcome email:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      message: error.message,
      stack: error.stack
    });
    
    // Don't fail registration if email sending fails
    // Just log the error and return success
    return res.status(200).json({ 
      success: false,
      error: 'Failed to send welcome email',
      details: error.message,
      note: 'Account creation succeeded, but welcome email could not be sent'
    });
  }
}

