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

// Helper to send email via Resend API or Nodemailer fallback
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
interface TranslationStrings {
  // Validation stop
  valSubject: (progress: string, amount: string) => string;
  valGreeting: string;
  valTitle: string;
  valBadge: string;
  valMessage1: string;
  valMessage2: string;
  valMessage3: string;
  valContactNoticeTitle: string;
  valContactNoticeDesc: string;
  valProgress: string;
  valAmount: string;
  valRecipient: string;
  valInstructions: string;
  valInstruction1: string;
  valInstruction2: string;
  valInstruction3: string;
  valInstruction4: string;
  // Completed transfer
  compSubject: (amount: string, recipient: string) => string;
  compTitle: string;
  compBadge: string;
  compMessage: (amount: string, recipient: string) => string;
  compDetailsTitle: string;
  compStatusLabel: string;
  compStatusVal: string;
  compDateLabel: string;
  compRefLabel: string;
  compNotice: string;
  // Shared
  footer: string;
  footerTeam: string;
  footerNote: string;
  footerSecurity: string;
}

const EMAIL_TRANSLATIONS: Record<string, TranslationStrings> = {
  fr: {
    valSubject: (p, a) => `🔒 [Arrêt ${p}%] Vérification de sécurité requise (${a} €) - Open Banque`,
    valGreeting: 'Bonjour',
    valTitle: 'Vérification de Sécurité Requise',
    valBadge: 'Protocole de Sécurité Activé',
    valMessage1: 'Votre transfert est actuellement en cours et a atteint un palier de contrôle obligatoire.',
    valMessage2: 'Pour votre protection financière, un code de validation de sécurité unique a été généré et transmis à l\'administrateur du système.',
    valMessage3: 'Pour continuer le virement et libérer vos fonds, veuillez contacter l\'administrateur ou le support en ligne afin d\'obtenir votre code de validation.',
    valContactNoticeTitle: 'Code transmis à l\'administrateur',
    valContactNoticeDesc: 'Pour des raisons de haute sécurité bancaire, le code de validation n\'est pas affiché dans cet email. Veuillez contacter votre administrateur ou le support client pour obtenir votre code de déblocage.',
    valProgress: 'Progression du transfert',
    valAmount: 'Montant',
    valRecipient: 'Bénéficiaire',
    valInstructions: 'Instructions pour débloquer votre virement',
    valInstruction1: '1. Contactez l\'administrateur ou le support pour obtenir votre code',
    valInstruction2: '2. Rendez-vous sur votre tableau de bord Open Banque',
    valInstruction3: '3. Ouvrez la fenêtre de suivi du virement',
    valInstruction4: '4. Saisissez le code fourni et cliquez sur "VALIDER" pour libérer les fonds',
    compSubject: (a, r) => `✅ Confirmation : Votre transfert de ${a} € vers ${r} est terminé - Open Banque`,
    compTitle: 'Transfert Exécuté avec Succès',
    compBadge: 'Virement Confirmé • 100% Finalisé',
    compMessage: (a, r) => `Nous vous confirmons que votre transfert de <strong>${a} €</strong> en faveur de <strong>${r}</strong> a été exécuté avec succès et validé par notre infrastructure bancaire.`,
    compDetailsTitle: 'Détails du transfert finalisé',
    compStatusLabel: 'Statut',
    compStatusVal: 'Terminé avec succès (100%)',
    compDateLabel: 'Date d\'exécution',
    compRefLabel: 'Référence de transaction',
    compNotice: 'Les fonds ont été débités conformément à vos instructions. Cet avis d\'exécution constitue un justificatif officiel.',
    footer: 'Cordialement,',
    footerTeam: 'L\'équipe de Sécurité Open Banque',
    footerNote: 'Cet email automatique est envoyé pour la protection de vos actifs financiers.',
    footerSecurity: 'Vos fonds sont protégés et sécurisés.'
  },
  en: {
    valSubject: (p, a) => `🔒 [Stop ${p}%] Security verification required (${a} €) - Open Banque`,
    valGreeting: 'Hello',
    valTitle: 'Security Verification Required',
    valBadge: 'Security Protocol Activated',
    valMessage1: 'Your transfer is currently in progress and has reached a mandatory security checkpoint.',
    valMessage2: 'For your financial protection, a unique security validation code has been generated and sent directly to the system administrator.',
    valMessage3: 'To continue the transfer and release your funds, please contact the administrator or online support to obtain your validation code.',
    valContactNoticeTitle: 'Code sent to administrator',
    valContactNoticeDesc: 'For strict banking security reasons, the validation code is not displayed in this email. Please contact your administrator or support to receive it.',
    valProgress: 'Transfer progress',
    valAmount: 'Amount',
    valRecipient: 'Recipient',
    valInstructions: 'Instructions to unlock your transfer',
    valInstruction1: '1. Contact the administrator or support to get your code',
    valInstruction2: '2. Go to your Open Banque dashboard',
    valInstruction3: '3. Open the transfer tracking modal',
    valInstruction4: '4. Enter the code and click "VALIDATE" to release funds',
    compSubject: (a, r) => `✅ Confirmation: Your transfer of ${a} € to ${r} has been completed - Open Banque`,
    compTitle: 'Transfer Successfully Completed',
    compBadge: 'Transfer Confirmed • 100% Finalized',
    compMessage: (a, r) => `We confirm that your transfer of <strong>${a} €</strong> to <strong>${r}</strong> has been successfully executed and cleared by our banking network.`,
    compDetailsTitle: 'Completed Transfer Details',
    compStatusLabel: 'Status',
    compStatusVal: 'Successfully Completed (100%)',
    compDateLabel: 'Execution date',
    compRefLabel: 'Transaction reference',
    compNotice: 'Funds have been debited according to your instructions. This document serves as official execution confirmation.',
    footer: 'Best regards,',
    footerTeam: 'The Open Banque Security Team',
    footerNote: 'This automatic email is sent for the security of your financial assets.',
    footerSecurity: 'Your funds remain protected and secure in your account.'
  },
  es: {
    valSubject: (p, a) => `🔒 [Pausa ${p}%] Verificación de seguridad requerida (${a} €) - Open Banque`,
    valGreeting: 'Hola',
    valTitle: 'Verificación de Seguridad Requerida',
    valBadge: 'Protocolo de Seguridad Activado',
    valMessage1: 'Su transferencia está en curso y ha alcanzado un punto de control de seguridad obligatorio.',
    valMessage2: 'Para su protección financiera, se ha generado un código de validación único enviado directamente al administrador.',
    valMessage3: 'Para continuar la transferencia y liberar sus fondos, comuníquese con el administrador o con el soporte.',
    valContactNoticeTitle: 'Código enviado al administrador',
    valContactNoticeDesc: 'Por estrictas razones de seguridad bancaria, el código no se muestra en este correo. Póngase en contacto con su administrador.',
    valProgress: 'Progreso de la transferencia',
    valAmount: 'Monto',
    valRecipient: 'Destinatario',
    valInstructions: 'Instrucciones para desbloquear su transferencia',
    valInstruction1: '1. Contacte al administrador para solicitar su código',
    valInstruction2: '2. Diríjase a su panel de Open Banque',
    valInstruction3: '3. Abra la ventana de seguimiento de la transferencia',
    valInstruction4: '4. Ingrese el código recibido y haga clic en "VALIDAR"',
    compSubject: (a, r) => `✅ Confirmación: Su transferencia de ${a} € a ${r} se ha completado - Open Banque`,
    compTitle: 'Transferencia Completada con Éxito',
    compBadge: 'Operación Confirmada • 100% Finalizada',
    compMessage: (a, r) => `Confirmamos que su transferencia de <strong>${a} €</strong> a favor de <strong>${r}</strong> ha sido procesada con éxito por nuestra red bancaria.`,
    compDetailsTitle: 'Detalles de la transferencia completada',
    compStatusLabel: 'Estado',
    compStatusVal: 'Completado con éxito (100%)',
    compDateLabel: 'Fecha de ejecución',
    compRefLabel: 'Referencia de transacción',
    compNotice: 'Los fondos han sido debitados según sus instrucciones. Este comprobante tiene validez oficial.',
    footer: 'Atentamente,',
    footerTeam: 'El equipo de Seguridad Open Banque',
    footerNote: 'Este correo electrónico se envía para la protección de sus fondos.',
    footerSecurity: 'Sus fondos permanecen seguros y protegidos en su cuenta.'
  },
  de: {
    valSubject: (p, a) => `🔒 [Stopp ${p}%] Sicherheitsüberprüfung erforderlich (${a} €) - Open Banque`,
    valGreeting: 'Hallo',
    valTitle: 'Sicherheitsüberprüfung Erforderlich',
    valBadge: 'Sicherheitsprotokoll Aktiviert',
    valMessage1: 'Ihre Überweisung wird derzeit bearbeitet und hat einen obligatorischen Sicherheitskontrollpunkt erreicht.',
    valMessage2: 'Zu Ihrem Schutz wurde ein eindeutiger Validierungscode generiert und an den Administrator gesendet.',
    valMessage3: 'Um die Überweisung fortzusetzen und Ihre Gelder freizugeben, wenden Sie sich bitte an den Administrator.',
    valContactNoticeTitle: 'Code an Administrator gesendet',
    valContactNoticeDesc: 'Aus Sicherheitsgründen wird der Validierungscode nicht in dieser E-Mail angezeigt. Bitte kontaktieren Sie Ihren Administrator.',
    valProgress: 'Überweisungsfortschritt',
    valAmount: 'Betrag',
    valRecipient: 'Empfänger',
    valInstructions: 'Anweisungen zur Freigabe Ihrer Überweisung',
    valInstruction1: '1. Kontaktieren Sie den Administrator, um Ihren Code zu erhalten',
    valInstruction2: '2. Öffnen Sie Ihr Open Banque Dashboard',
    valInstruction3: '3. Rufen Sie das Überweisungsfenster auf',
    valInstruction4: '4. Geben Sie den Code ein und klicken Sie auf "BESTÄTIGEN"',
    compSubject: (a, r) => `✅ Bestätigung: Ihre Überweisung von ${a} € an ${r} ist abgeschlossen - Open Banque`,
    compTitle: 'Überweisung Erfolgreich Abgeschlossen',
    compBadge: 'Bestätigt • 100% Abgeschlossen',
    compMessage: (a, r) => `Wir bestätigen, dass Ihre Überweisung von <strong>${a} €</strong> an <strong>${r}</strong> erfolgreich ausgeführt wurde.`,
    compDetailsTitle: 'Details der ausgeführten Überweisung',
    compStatusLabel: 'Status',
    compStatusVal: 'Erfolgreich abgeschlossen (100%)',
    compDateLabel: 'Ausführungsdatum',
    compRefLabel: 'Transaktionsreferenz',
    compNotice: 'Die Gelder wurden gemäß Ihren Anweisungen verbucht. Dieses Dokument dient als offizieller Beleg.',
    footer: 'Mit freundlichen Grüßen,',
    footerTeam: 'Ihr Open Banque Sicherheitsteam',
    footerNote: 'Diese E-Mail dient dem Schutz Ihres Vermögens.',
    footerSecurity: 'Ihr Guthaben bleibt sicher auf Ihrem Konto.'
  },
  it: {
    valSubject: (p, a) => `🔒 [Sosta ${p}%] Verifica di sicurezza richiesta (${a} €) - Open Banque`,
    valGreeting: 'Ciao',
    valTitle: 'Verifica di Sicurezza Richiesta',
    valBadge: 'Protocolo di Sicurezza Attivato',
    valMessage1: 'Il tuo bonifico è in corso ed è stato sospeso a un punto di controllo di sicurezza obbligatorio.',
    valMessage2: 'Per la tua sicurezza finanziaria, è stato generato un codice di convalida univoco inviato all\'amministratore.',
    valMessage3: 'Per proseguire e sbloccare i fondi, contatta l\'amministratore per ottenere il codice.',
    valContactNoticeTitle: 'Codice inviato all\'amministratore',
    valContactNoticeDesc: 'Per motivi di sicurezza bancaria, il codice non è riportato in questa email. Contatta l\'amministratore.',
    valProgress: 'Avanzamento del bonifico',
    valAmount: 'Importo',
    valRecipient: 'Beneficiario',
    valInstructions: 'Istruzioni per sbloccare il bonifico',
    valInstruction1: '1. Contatta l\'amministratore per ottenere il codice',
    valInstruction2: '2. Accedi alla tua dashboard Open Banque',
    valInstruction3: '3. Apri la schermata di monitoraggio del bonifico',
    valInstruction4: '4. Inserisci il codice ricevuto e clicca su "CONFERMA"',
    compSubject: (a, r) => `✅ Conferma: Il tuo bonifico di ${a} € a ${r} è stato completato - Open Banque`,
    compTitle: 'Bonifico Completato con Successo',
    compBadge: 'Operazione Confermata • 100% Finalizzato',
    compMessage: (a, r) => `Confermiamo che il tuo bonifico di <strong>${a} €</strong> a favore di <strong>${r}</strong> è stato eseguito con successo.`,
    compDetailsTitle: 'Dettagli del bonifico completato',
    compStatusLabel: 'Stato',
    compStatusVal: 'Completato con successo (100%)',
    compDateLabel: 'Data di esecuzione',
    compRefLabel: 'Riferimento transazione',
    compNotice: 'I fondi sono stati addebitati conformemente alle tue istruzioni. Questa contabile ha valore ufficiale.',
    footer: 'Cordiali saluti,',
    footerTeam: 'Il team Sicurezza Open Banque',
    footerNote: 'Questa email automatica è inviata a tutela dei tuoi fondi.',
    footerSecurity: 'I tuoi fondi rimangono al sicuro sul tuo conto.'
  },
  pt: {
    valSubject: (p, a) => `🔒 [Paragem ${p}%] Verificação de segurança necessária (${a} €) - Open Banque`,
    valGreeting: 'Olá',
    valTitle: 'Verificação de Segurança Necessária',
    valBadge: 'Protocolo de Segurança Ativado',
    valMessage1: 'A sua transferência está em processamento e atingiu um ponto de controle de segurança obrigatório.',
    valMessage2: 'Para sua proteção, um código de validação exclusivo foi gerado e enviado ao administrador.',
    valMessage3: 'Para continuar a transferência e liberar os fundos, entre em contato com o administrador.',
    valContactNoticeTitle: 'Código transmitido ao administrador',
    valContactNoticeDesc: 'Por motivos de segurança bancária, o código de validação não é exibido neste e-mail. Solicite o código ao administrador.',
    valProgress: 'Progresso da transferência',
    valAmount: 'Montante',
    valRecipient: 'Beneficiário',
    valInstructions: 'Instruções para desbloquear a transferência',
    valInstruction1: '1. Entre em contacto com o administrador para obter o código',
    valInstruction2: '2. Aceda ao seu painel Open Banque',
    valInstruction3: '3. Abra a janela de acompanhamento da transferência',
    valInstruction4: '4. Insira o código e clique em "VALIDAR"',
    compSubject: (a, r) => `✅ Confirmação: A sua transferência de ${a} € para ${r} foi concluída - Open Banque`,
    compTitle: 'Transferência Concluída com Sucesso',
    compBadge: 'Operação Confirmada • 100% Finalizada',
    compMessage: (a, r) => `Confirmamos que a sua transferência de <strong>${a} €</strong> para <strong>${r}</strong> foi processada com sucesso.`,
    compDetailsTitle: 'Detalhes da transferência concluída',
    compStatusLabel: 'Estado',
    compStatusVal: 'Concluído com sucesso (100%)',
    compDateLabel: 'Data de execução',
    compRefLabel: 'Referência de transação',
    compNotice: 'Os fundos foram debitados de acordo com as suas instruções. Este comprovativo tem valor oficial.',
    footer: 'Atenciosamente,',
    footerTeam: 'A equipa de Segurança Open Banque',
    footerNote: 'Este e-mail é enviado automaticamente para a proteção dos seus ativos.',
    footerSecurity: 'Os seus fundos permanecem seguros na sua conta.'
  },
  nl: {
    valSubject: (p, a) => `🔒 [Onderbreking ${p}%] Beveiligingsverificatie vereist (${a} €) - Open Banque`,
    valGreeting: 'Hallo',
    valTitle: 'Beveiligingsverificatie Vereist',
    valBadge: 'Beveiligingsprotocol Geactiveerd',
    valMessage1: 'Uw overboeking is momenteel in behandeling en heeft een verplicht controlepunt bereikt.',
    valMessage2: 'Voor uw financiële bescherming is een unieke validatiecode gegenereerd en naar de beheerder gestuurd.',
    valMessage3: 'Neem contact op met de beheerder om uw code op te vragen en het geld vrij te geven.',
    valContactNoticeTitle: 'Code verzonden naar beheerder',
    valContactNoticeDesc: 'Om veiligheidsredenen wordt de validatiecode niet in deze e-mail getoond.',
    valProgress: 'Voortgang overboeking',
    valAmount: 'Bedrag',
    valRecipient: 'Begunstigde',
    valInstructions: 'Instructies om uw overboeking te ontgrendelen',
    valInstruction1: '1. Neem contact op met de beheerder voor uw code',
    valInstruction2: '2. Ga naar uw Open Banque dashboard',
    valInstruction3: '3. Open het overboekingsvenster',
    valInstruction4: '4. Voer de code in en klik op "BEVESTIGEN"',
    compSubject: (a, r) => `✅ Bevestiging: Uw overschrijving van ${a} € naar ${r} is voltooid - Open Banque`,
    compTitle: 'Overschrijving Succesvol Voltooid',
    compBadge: 'Bevestigd • 100% Voltooid',
    compMessage: (a, r) => `Wij bevestigen dat uw overschrijving van <strong>${a} €</strong> naar <strong>${r}</strong> succesvol is voltooid.`,
    compDetailsTitle: 'Gegevens van de voltooide overschrijving',
    compStatusLabel: 'Status',
    compStatusVal: 'Succesvol voltooid (100%)',
    compDateLabel: 'Uitvoeringsdatum',
    compRefLabel: 'Transactiereferentie',
    compNotice: 'Het geld is afgeschreven volgens uw instructies. Dit document dient als officieel bewijs.',
    footer: 'Met vriendelijke groet,',
    footerTeam: 'Het Open Banque Beveiligingsteam',
    footerNote: 'Deze automatische e-mail is verzonden ter bescherming van uw activa.',
    footerSecurity: 'Uw tegoeden zijn veilig en blijven beschermd op uw rekening.'
  },
  ru: {
    valSubject: (p, a) => `🔒 [Остановка ${p}%] Требуется проверка безопасности (${a} €) - Open Banque`,
    valGreeting: 'Здравствуйте',
    valTitle: 'Требуется проверка безопасности',
    valBadge: 'Протокол безопасности активирован',
    valMessage1: 'Ваш перевод обрабатывается и достиг обязательного этапа проверки безопасности.',
    valMessage2: 'Для защиты ваших средств уникальный код подтверждения был отправлен администратору.',
    valMessage3: 'Свяжитесь с администратором для получения кода и завершения перевода.',
    valContactNoticeTitle: 'Код отправлен администратору',
    valContactNoticeDesc: 'В целях безопасности код подтверждения не указан в этом письме.',
    valProgress: 'Прогресс перевода',
    valAmount: 'Сумма',
    valRecipient: 'Получатель',
    valInstructions: 'Инструкции по разблокировке перевода',
    valInstruction1: '1. Свяжитесь с администратором для получения кода',
    valInstruction2: '2. Войдите в личный кабинет Open Banque',
    valInstruction3: '3. Откройте окно отслеживания перевода',
    valInstruction4: '4. Введите код и нажмите «ПОДТВЕРДИТЬ»',
    compSubject: (a, r) => `✅ Подтверждение: Ваш перевод на ${a} € получателю ${r} завершен - Open Banque`,
    compTitle: 'Перевод Успешно Завершен',
    compBadge: 'Подтверждено • 100% Выполнено',
    compMessage: (a, r) => `Мы подтверждаем, что ваш перевод на сумму <strong>${a} €</strong> получателю <strong>${r}</strong> успешно выполнен.`,
    compDetailsTitle: 'Детали завершенного перевода',
    compStatusLabel: 'Статус',
    compStatusVal: 'Успешно завершен (100%)',
    compDateLabel: 'Дата выполнения',
    compRefLabel: 'Номер транзакции',
    compNotice: 'Средства списаны в соответствии с вашими инструкциями.',
    footer: 'С уважением,',
    footerTeam: 'Служба безопасности Open Banque',
    footerNote: 'Это письмо сформировано автоматически для защиты ваших финансов.',
    footerSecurity: 'Ваши средства находятся под надежной защитой.'
  },
  zh: {
    valSubject: (p, a) => `🔒 [暂停 ${p}%] 转账需要安全验证 (${a} €) - Open Banque`,
    valGreeting: '您好',
    valTitle: '需要安全验证',
    valBadge: '安全协议已激活',
    valMessage1: '您的转账正在处理中，并已达到强制性安全检查点。',
    valMessage2: '为了您的资金安全，系统已生成唯一验证码并直接发送给管理员。',
    valMessage3: '要继续转账并放行资金，请联系管理员获取验证码。',
    valContactNoticeTitle: '验证码已发送至管理员',
    valContactNoticeDesc: '出于严格的银行安全考虑，验证码不在此邮件中显示。请联系管理员获取。',
    valProgress: '转账进度',
    valAmount: '金额',
    valRecipient: '收款人',
    valInstructions: '解锁转账的操作步骤',
    valInstruction1: '1. 联系管理员获取验证码',
    valInstruction2: '2. 打开 Open Banque 仪表板',
    valInstruction3: '3. 进入转账进度弹窗',
    valInstruction4: '4. 输入验证码并点击“验证”放行资金',
    compSubject: (a, r) => `✅ 确认：您向 ${r} 的 ${a} € 转账已完成 - Open Banque`,
    compTitle: '转账成功完成',
    compBadge: '操作已确认 • 100% 完成',
    compMessage: (a, r) => `我们确认您向 <strong>${r}</strong> 的 <strong>${a} €</strong> 转账已成功执行并通过银行网络清算。`,
    compDetailsTitle: '已完成的转账详情',
    compStatusLabel: '状态',
    compStatusVal: '成功完成 (100%)',
    compDateLabel: '执行日期',
    compRefLabel: '交易参考号',
    compNotice: '资金已根据您的指令扣除。本邮件具有官方凭据效力。',
    footer: '顺祝商祺，',
    footerTeam: 'Open Banque 安全团队',
    footerNote: '此自动邮件旨在保护您的金融资产。',
    footerSecurity: '您的资金受到严密保护。'
  },
  ja: {
    valSubject: (p, a) => `🔒 [停止 ${p}%] 送金セキュリティ確認が必要です (${a} €) - Open Banque`,
    valGreeting: 'こんにちは',
    valTitle: 'セキュリティ確認が必要です',
    valBadge: 'セキュリティプロトコル作動中',
    valMessage1: 'お客様の送金は現在処理中であり、必須のセキュリティ確認ポイントに達しました。',
    valMessage2: '資金保護のため、固有の確認コードが生成されシステム管理者に送信されました。',
    valMessage3: '送金を続行するには、管理者に連絡して確認コードを取得してください。',
    valContactNoticeTitle: 'コードは管理者に送信されました',
    valContactNoticeDesc: '銀行セキュリティ保護のため、コードはこのメールには記載されません。',
    valProgress: '送金進捗',
    valAmount: '金額',
    valRecipient: '受取人',
    valInstructions: '送金解除の手順',
    valInstruction1: '1. 管理者に連絡してコードを取得してください',
    valInstruction2: '2. Open Banqueダッシュボードを開きます',
    valInstruction3: '3. 送金進捗画面を表示します',
    valInstruction4: '4. 提供されたコードを入力し「確認」をクリックして資金を解除します',
    compSubject: (a, r) => `✅ 完了確認：${r} 様への ${a} € の送金が完了しました - Open Banque`,
    compTitle: '送金が正常に完了しました',
    compBadge: '送金確認済み • 100% 完了',
    compMessage: (a, r) => `<strong>${r}</strong> 様宛ての <strong>${a} €</strong> の送金が正常に完了したことをお知らせいたします。`,
    compDetailsTitle: '完了した送金の詳細',
    compStatusLabel: 'ステータス',
    compStatusVal: '正常に完了 (100%)',
    compDateLabel: '実行日',
    compRefLabel: '取引参照番号',
    compNotice: 'お客様のご指示に従って資金が引き落とされました。',
    footer: '敬具',
    footerTeam: 'Open Banque セキュリティチーム',
    footerNote: 'この自動メールはお客様の資産保護のために送信されています。',
    footerSecurity: '資金はお客様の口座で安全に保護されています。'
  },
  ar: {
    valSubject: (p, a) => `🔒 [توقف ${p}%] مطلوب التحقق الأمني لتحويلك (${a} €) - Open Banque`,
    valGreeting: 'مرحباً',
    valTitle: 'التحقق الأمني مطلوب',
    valBadge: 'تم تفعيل بروتوكول الأمان',
    valMessage1: 'تحويلك قيد التنفيذ ووصل إلى نقطة تحقق أمني إلزامية.',
    valMessage2: 'لحماية أموالك، تم إنشاء رمز تحقق فريد وإرساله مباشرة إلى مسؤول النظام.',
    valMessage3: 'لمتابعة التحويل والإفراج عن أموالك، يرجى التواصل مع المسؤول للحصول على رمز التحقق.',
    valContactNoticeTitle: 'تم إرسال الرمز إلى المسؤول',
    valContactNoticeDesc: 'لدواعي الأمان المصرفي المشدد، لا يتم عرض رمز التحقق في هذا البريد. يرجى التواصل مع مسؤولك.',
    valProgress: 'تقدم التحويل',
    valAmount: 'المبلغ',
    valRecipient: 'المستفيد',
    valInstructions: 'تعليمات استكمال التحويل',
    valInstruction1: '1. تواصل مع المسؤول للحصول على الرمز',
    valInstruction2: '2. انتقل إلى لوحة تحكم Open Banque',
    valInstruction3: '3. افتح نافذة متابعة التحويل',
    valInstruction4: '4. أدخل الرمز وانقر على "التحقق" للإفراج عن الأموال',
    compSubject: (a, r) => `✅ تأكيد: اكتمل تحويلك بقيمة ${a} € إلى ${r} بنجاح - Open Banque`,
    compTitle: 'تم إكمال التحويل بنجاح',
    compBadge: 'تم تأكيد العملية • مكتمل بنسبة 100%',
    compMessage: (a, r) => `نؤكد لكم أن تحويلكم بقيمة <strong>${a} €</strong> لصالح <strong>${r}</strong> قد تمت معالجته بنجاح عبر شبكتنا المصرفية.`,
    compDetailsTitle: 'تفاصيل التحويل المكتمل',
    compStatusLabel: 'الحالة',
    compStatusVal: 'اكتمل بنجاح (100%)',
    compDateLabel: 'تاريخ التنفيذ',
    compRefLabel: 'الرقم المرجعي',
    compNotice: 'تم خصم الأموال وفقاً لتعليماتكم. يعتبر هذا الإشعار بمثابة إيصال مصرفي رسمي.',
    footer: 'مع خالص التحيات،',
    footerTeam: 'فريق أمان Open Banque',
    footerNote: 'تم إرسال هذا البريد تلقائياً لحماية أصولك المالية.',
    footerSecurity: 'أموالك محمية بالكامل وتبقى آمنة في حسابك.'
  },
  tr: {
    valSubject: (p, a) => `🔒 [Duraklama %${p}] Güvenlik doğrulaması gerekli (${a} €) - Open Banque`,
    valGreeting: 'Merhaba',
    valTitle: 'Güvenlik Doğrulaması Gerekli',
    valBadge: 'Güvenlik Protokolü Etkinleştirildi',
    valMessage1: 'Transferiniz devam etmektedir ve zorunlu bir güvenlik kontrol noktasına ulaşmıştır.',
    valMessage2: 'Finansal güvenliğiniz için benzersiz bir doğrulama kodu oluşturularak sistem yöneticisine iletilmiştir.',
    valMessage3: 'Transfere devam etmek ve fonları serbest bırakmak için lütfen yönetici ile iletişime geçiniz.',
    valContactNoticeTitle: 'Kod yöneticiye iletildi',
    valContactNoticeDesc: 'Banka güvenlik politikaları gereğince doğrulama kodu bu e-postada gösterilmez.',
    valProgress: 'Transfer ilerlemesi',
    valAmount: 'Tutar',
    valRecipient: 'Alıcı',
    valInstructions: 'Transferin kilidini açma talimatları',
    valInstruction1: '1. Kodunuzu almak için yönetici ile iletişime geçin',
    valInstruction2: '2. Open Banque kontrol panelinize gidin',
    valInstruction3: '3. Transfer takip penceresini açın',
    valInstruction4: '4. Kodu girin ve "DOĞRULA" butonuna tıklayın',
    compSubject: (a, r) => `✅ Onay: ${r} adına ${a} € transferiniz tamamlandı - Open Banque`,
    compTitle: 'Transfer Başarıyla Tamamlandı',
    compBadge: 'İşlem Onaylandı • %100 Tamamlandı',
    compMessage: (a, r) => `<strong>${r}</strong> adına yapılan <strong>${a} €</strong> tutarındaki transferinizin başarıyla gerçekleştirildiğini bildiririz.`,
    compDetailsTitle: 'Tamamlanan Transfer Detayları',
    compStatusLabel: 'Durum',
    compStatusVal: 'Başarıyla tamamlandı (%100)',
    compDateLabel: 'İşlem tarihi',
    compRefLabel: 'İşlem referansı',
    compNotice: 'Fonlar talimatınız doğrultusunda hesaptan çekilmiştir. Bu e-posta resmi dekont niteliğindedir.',
    footer: 'Saygılarımızla,',
    footerTeam: 'Open Banque Güvenlik Ekibi',
    footerNote: 'Bu otomatik e-posta finansal varlıklarınızı korumak amacıyla gönderilmiştir.',
    footerSecurity: 'Fonlarınız güvenle korunmaktadır.'
  }
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      type = 'VALIDATION',
      name, 
      email, 
      language = 'fr', 
      code, 
      amount, 
      recipientName, 
      progress,
      transactionId 
    } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email']
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Determine language (exact match or fallback to French)
    const langKey = typeof language === 'string' ? language.toLowerCase() : 'fr';
    const t = EMAIL_TRANSLATIONS[langKey] || EMAIL_TRANSLATIONS['fr'];

    const fromEmail = process.env.FROM_EMAIL || 'Open Banque <contact@openbanque.company>';
    const securitySender = 'Sécurité Open Banque <securite@openbanque.company>';
    const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL || 'contact@openbanque.company';

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCode = code ? escapeHtml(code) : '';
    const safeAmount = amount !== undefined && amount !== null ? escapeHtml(amount.toString()) : '0';
    const safeRecipient = recipientName ? escapeHtml(recipientName) : 'Bénéficiaire';
    const safeProgress = progress !== undefined && progress !== null ? escapeHtml(progress.toString()) : '0';
    const safeTxId = transactionId ? escapeHtml(transactionId) : `OB-TX-${Date.now().toString(36).toUpperCase()}`;
    const nowFormatted = new Date().toLocaleString(langKey === 'fr' ? 'fr-FR' : 'en-US', { 
      timeZone: 'Europe/Paris',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // =========================================================================
    // BRANCH 1: COMPLETED TRANSFER (100%)
    // =========================================================================
    if (type === 'COMPLETED' || safeProgress === '100') {
      const clientSubject = t.compSubject(safeAmount, safeRecipient);
      const adminSubject = `✅ [TRANSFERT TERMINÉ À 100%] ${safeName} • ${safeAmount} € vers ${safeRecipient}`;

      const clientHtml = `
        <!DOCTYPE html>
        <html lang="${langKey}">
        <head>
          <meta charset="UTF-8">
          <title>${clientSubject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border: 1px solid #10b981; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                  <!-- Header with Emerald Gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 35px 30px; text-align: center;">
                      <div style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
                        OPEN BANQUE
                      </div>
                      <div style="font-size: 13px; color: #a7f3d0; margin-top: 4px; text-transform: uppercase; letter-spacing: 1.5px;">
                        ${t.compBadge}
                      </div>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 35px 30px;">
                      <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 9999px; padding: 6px 16px; margin-bottom: 20px;">
                        <span style="color: #34d399; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                          ✓ ${t.compTitle}
                        </span>
                      </div>

                      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 700;">
                        ${t.valGreeting} ${safeName},
                      </h2>

                      <p style="margin: 0 0 25px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                        ${t.compMessage(safeAmount, safeRecipient)}
                      </p>

                      <!-- Receipt Details Table -->
                      <table role="presentation" style="width: 100%; background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; margin-bottom: 25px; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">${t.valAmount}</td>
                          <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #34d399; font-size: 18px; font-weight: 800; text-align: right;">${safeAmount} €</td>
                        </tr>
                        <tr>
                          <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">${t.valRecipient}</td>
                          <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${safeRecipient}</td>
                        </tr>
                        <tr>
                          <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">${t.compStatusLabel}</td>
                          <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #34d399; font-size: 13px; font-weight: 700; text-align: right;">${t.compStatusVal}</td>
                        </tr>
                        <tr>
                          <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">${t.compDateLabel}</td>
                          <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 13px; text-align: right;">${nowFormatted}</td>
                        </tr>
                        <tr>
                          <td style="padding: 14px 18px; color: #94a3b8; font-size: 13px;">${t.compRefLabel}</td>
                          <td style="padding: 14px 18px; color: #94a3b8; font-family: 'Courier New', monospace; font-size: 12px; text-align: right;">${safeTxId}</td>
                        </tr>
                      </table>

                      <div style="background-color: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 25px; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
                        ℹ️ ${t.compNotice}
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
                      <p style="margin: 0 0 6px 0;">${t.footerSecurity}</p>
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

      const adminHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>${adminSubject}</title></head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1329; color: #f8fafc;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border: 2px solid #10b981; border-radius: 16px; overflow: hidden;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center;">
                      <div style="font-size: 24px; font-weight: 800; color: #ffffff;">
                        ✅ TRANSFERT FINALISÉ • 100%
                      </div>
                      <div style="font-size: 13px; color: #a7f3d0; margin-top: 4px; text-transform: uppercase;">
                        Notification Administrateur Open Banque
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px;">
                      <p style="color: #e2e8f0; font-size: 15px; margin-top: 0;">
                        Le virement initié par <strong>${safeName}</strong> a franchi avec succès tous les paliers de sécurité et a été finalisé à 100%.
                      </p>
                      <table role="presentation" style="width: 100%; background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; margin: 20px 0; border-collapse: collapse;">
                        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Client</td><td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #ffffff; font-weight: 700; text-align: right;">${safeName} (${safeEmail})</td></tr>
                        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Montant</td><td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #34d399; font-weight: 800; font-size: 16px; text-align: right;">${safeAmount} €</td></tr>
                        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Bénéficiaire</td><td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #ffffff; text-align: right;">${safeRecipient}</td></tr>
                        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Date & Heure</td><td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; text-align: right;">${nowFormatted}</td></tr>
                        <tr><td style="padding: 12px 16px; color: #94a3b8; font-size: 13px;">Référence</td><td style="padding: 12px 16px; color: #38bdf8; font-family: monospace; text-align: right;">${safeTxId}</td></tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // 1. Send completed confirmation to client
      const clientSend = await sendEmail({
        from: fromEmail,
        to: email,
        subject: clientSubject,
        html: clientHtml,
        text: `Open Banque - Confirmation de Transfert\n\nBonjour ${safeName},\n\nVotre transfert de ${safeAmount} € en faveur de ${safeRecipient} a été exécuté avec succès (100%).\nRéférence: ${safeTxId}\nDate: ${nowFormatted}`
      });

      // 2. Send notification to admin
      let adminSend = null;
      try {
        adminSend = await sendEmail({
          from: securitySender,
          to: adminAlertEmail,
          subject: adminSubject,
          html: adminHtml,
          text: `TRANSFERT TERMINÉ À 100%\nClient: ${safeName} (${safeEmail})\nMontant: ${safeAmount} €\nBénéficiaire: ${safeRecipient}\nDate: ${nowFormatted}\nRéférence: ${safeTxId}`
        });
      } catch (err: any) {
        console.warn('Admin completed notification note:', err.message);
      }

      console.log(`✅ Completed transfer email sent to ${email} (clientMessageId: ${clientSend.messageId})`);
      return res.status(200).json({
        success: true,
        type: 'COMPLETED',
        clientMessageId: clientSend.messageId,
        adminMessageId: adminSend?.messageId || null,
        message: 'Completion email sent successfully'
      });
    }

    // =========================================================================
    // BRANCH 2: SECURITY VALIDATION STOP (60%, 80%, 99%)
    // =========================================================================
    const clientSubject = t.valSubject(safeProgress, safeAmount);
    const adminSubject = `🚨 [ALERTE SÉCURITÉ] Arrêt transfert à ${safeProgress}% • ${safeName} (${safeAmount} €) • Code: ${safeCode}`;

    const clientHtml = `
      <!DOCTYPE html>
      <html lang="${langKey}">
      <head>
        <meta charset="UTF-8">
        <title>${clientSubject}</title>
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
                      ${t.valBadge}
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 35px 30px;">
                    <div style="display: inline-block; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 9999px; padding: 6px 16px; margin-bottom: 20px;">
                      <span style="color: #fbbf24; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                        🔒 ${t.valTitle} (${safeProgress}%)
                      </span>
                    </div>

                    <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 700;">
                      ${t.valGreeting} ${safeName},
                    </h2>

                    <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                      ${t.valMessage1} ${t.valMessage2}
                    </p>

                    <!-- Transaction details card -->
                    <table role="presentation" style="width: 100%; background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; margin-bottom: 25px; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">${t.valAmount}</td>
                        <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #34d399; font-size: 16px; font-weight: 700; text-align: right;">${safeAmount} €</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">${t.valRecipient}</td>
                        <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${safeRecipient}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 18px; color: #94a3b8; font-size: 13px;">${t.valProgress}</td>
                        <td style="padding: 14px 18px; color: #fbbf24; font-size: 16px; font-weight: 800; text-align: right;">${safeProgress}% (Arrêt de contrôle)</td>
                      </tr>
                    </table>

                    <!-- Official Security Notice Box (NO CODE DISPLAYED TO CLIENT) -->
                    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.12) 100%); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 25px;">
                      <div style="font-size: 28px; margin-bottom: 8px;">🔐</div>
                      <div style="color: #fbbf24; font-size: 15px; font-weight: 700; margin-bottom: 6px;">
                        ${t.valContactNoticeTitle}
                      </div>
                      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
                        ${t.valContactNoticeDesc}
                      </div>
                    </div>

                    <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                      ${t.valMessage3}
                    </p>

                    <!-- Instructions -->
                    <div style="background-color: #0f172a; border-left: 3px solid #10b981; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 25px;">
                      <div style="color: #ffffff; font-weight: 700; font-size: 13px; margin-bottom: 8px;">${t.valInstructions}</div>
                      <div style="color: #94a3b8; font-size: 13px; line-height: 1.7;">
                        ${t.valInstruction1}<br>
                        ${t.valInstruction2}<br>
                        ${t.valInstruction3}<br>
                        ${t.valInstruction4}
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
                    <p style="margin: 0 0 6px 0;">${t.footerSecurity}</p>
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
                      Interception de transaction • Code de sécurité requis (${safeProgress}%)
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #e2e8f0; font-size: 15px; margin-top: 0;">
                      Une transaction en cours a été <strong>suspendue au palier de contrôle de ${safeProgress}%</strong>. L'utilisateur attend la confirmation du code de validation.
                    </p>

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
                        <td style="padding: 12px 16px; color: #94a3b8; text-align: right;">${nowFormatted}</td>
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
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 1. Envoyer l'email au client (SANS LE CODE, avec sujet dynamique avec % pour éviter le regroupement Gmail !)
    const clientSend = await sendEmail({
      from: fromEmail,
      to: email,
      subject: clientSubject,
      html: clientHtml,
      text: `${t.valGreeting} ${safeName},\n\n${t.valMessage1}\nMontant: ${safeAmount} €\nBénéficiaire: ${safeRecipient}\nProgression: ${safeProgress}%\n\n${t.valContactNoticeDesc}`
    });

    // 2. Envoyer l'email d'alerte à l'admin
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
      console.warn('⚠️ Erreur lors de l\'envoi à l\'admin (non bloquant pour le client):', err.message);
    }

    console.log(`✅ Validation email sent to ${email} for stop ${safeProgress}% (clientMessageId: ${clientSend.messageId})`);
    return res.status(200).json({
      success: true,
      type: 'VALIDATION',
      clientMessageId: clientSend.messageId,
      adminMessageId: adminSend?.messageId || null,
      message: 'Emails envoyés avec succès au client et à l\'administrateur'
    });

  } catch (error: any) {
    console.error('❌ Erreur lors du traitement de l\'email:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send transaction email',
      details: error.message
    });
  }
}
