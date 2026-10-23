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

// Helper to send email via Resend API or Nodemailer fallback with full anti-spam headers
async function sendEmail({
  from,
  to,
  replyTo = 'contact@openbanque.company',
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
        reply_to: replyTo,
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': '<mailto:contact@openbanque.company?subject=unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Entity-Ref-ID': `OB-${Date.now()}`
        }
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
    replyTo,
    subject,
    html,
    text
  });
}

// Complete 11 languages translations for the CLIENT email (Clean, professional, anti-spam subjects)
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
    valSubject: (p, a) => `Open Banque : Vérification requise (Palier ${p}%) pour votre virement de ${a} €`,
    valGreeting: 'Bonjour',
    valTitle: 'Vérification de Sécurité Requise',
    valBadge: 'Contrôle de Sécurité Activé',
    valMessage1: 'Votre virement interbancaire est en cours de traitement et a atteint un palier de vérification réglementaire.',
    valMessage2: 'Pour votre protection financière, un code de validation officiel a été généré et transmis au gestionnaire de compte.',
    valMessage3: 'Pour valider la poursuite de votre opération, nous vous invitons à contacter votre conseiller ou le support.',
    valContactNoticeTitle: 'Code sécurisé transmis à l\'administrateur',
    valContactNoticeDesc: 'Conformément aux normes bancaires de sécurité, le code de validation n\'est pas communiqué dans cet e-mail. Veuillez contacter l\'administrateur ou le support pour l\'obtenir.',
    valProgress: 'Progression de l\'opération',
    valAmount: 'Montant du transfert',
    valRecipient: 'Bénéficiaire désigné',
    valInstructions: 'Marche à suivre pour poursuivre le virement',
    valInstruction1: '1. Contactez l\'administrateur ou le support pour obtenir votre code',
    valInstruction2: '2. Rendez-vous sur votre espace client Open Banque',
    valInstruction3: '3. Affichez la fenêtre de suivi du virement',
    valInstruction4: '4. Saisissez le code de validation pour poursuivre l\'exécution',
    compSubject: (a, r) => `Open Banque : Confirmation d'exécution de votre virement de ${a} € vers ${r}`,
    compTitle: 'Transfert Exécuté avec Succès',
    compBadge: 'Opération Validée • 100% Finalisé',
    compMessage: (a, r) => `Nous vous confirmons que votre virement de <strong>${a} €</strong> au profit de <strong>${r}</strong> a été exécuté avec succès et validé par notre système bancaire.`,
    compDetailsTitle: 'Détails de l\'opération',
    compStatusLabel: 'Statut',
    compStatusVal: 'Exécuté avec succès (100%)',
    compDateLabel: 'Date et heure de règlement',
    compRefLabel: 'Numéro de transaction bancaire',
    compNotice: 'Les fonds ont été débités conformément à vos instructions. Cet avis d\'exécution constitue un justificatif officiel.',
    footer: 'Cordialement,',
    footerTeam: 'Le service des Opérations Open Banque',
    footerNote: 'Ce message d\'information automatique vous est adressé dans le cadre de la gestion de votre compte bancaire.',
    footerSecurity: 'Vos opérations bancaires sont protégées par chiffrement de bout en bout.'
  },
  en: {
    valSubject: (p, a) => `Open Banque: Verification required (Step ${p}%) for your transfer of ${a} €`,
    valGreeting: 'Hello',
    valTitle: 'Security Verification Required',
    valBadge: 'Security Control Activated',
    valMessage1: 'Your interbank transfer is being processed and has reached a mandatory compliance checkpoint.',
    valMessage2: 'For your protection, a secure validation code has been generated and transmitted to the account manager.',
    valMessage3: 'To continue your transfer, please contact your account manager or support.',
    valContactNoticeTitle: 'Validation code sent to administrator',
    valContactNoticeDesc: 'In accordance with banking standards, the code is not displayed in this email. Please contact the administrator or support to receive it.',
    valProgress: 'Transfer progress',
    valAmount: 'Transfer amount',
    valRecipient: 'Designated beneficiary',
    valInstructions: 'Instructions to continue the transfer',
    valInstruction1: '1. Contact the administrator or support to get your code',
    valInstruction2: '2. Access your Open Banque dashboard',
    valInstruction3: '3. Open the transfer tracking modal',
    valInstruction4: '4. Enter the code to proceed with execution',
    compSubject: (a, r) => `Open Banque: Transfer confirmation - Payment of ${a} € to ${r} completed`,
    compTitle: 'Transfer Successfully Completed',
    compBadge: 'Confirmed • 100% Finalized',
    compMessage: (a, r) => `We confirm that your transfer of <strong>${a} €</strong> to <strong>${r}</strong> has been successfully executed and cleared by our banking network.`,
    compDetailsTitle: 'Transaction Details',
    compStatusLabel: 'Status',
    compStatusVal: 'Successfully Executed (100%)',
    compDateLabel: 'Settlement date and time',
    compRefLabel: 'Transaction reference',
    compNotice: 'Funds have been debited according to your instructions. This document serves as official execution confirmation.',
    footer: 'Best regards,',
    footerTeam: 'Open Banque Operations Department',
    footerNote: 'This automatic notification is sent in connection with your account operations.',
    footerSecurity: 'Your banking transactions are protected by end-to-end encryption.'
  },
  es: {
    valSubject: (p, a) => `Open Banque: Verificación requerida (Paso ${p}%) para su transferencia de ${a} €`,
    valGreeting: 'Estimado/a cliente',
    valTitle: 'Verificación de Seguridad Requerida',
    valBadge: 'Control de Seguridad Activado',
    valMessage1: 'Su transferencia interbancaria se está procesando y ha alcanzado un punto de control obligatorio.',
    valMessage2: 'Para su protección, se ha generado un código de validación enviado directamente al administrador.',
    valMessage3: 'Para continuar la transferencia, comuníquese con su administrador o con el soporte.',
    valContactNoticeTitle: 'Código transmitido al administrador',
    valContactNoticeDesc: 'Por motivos de seguridad bancaria, el código no se muestra en este correo. Póngase en contacto con su administrador.',
    valProgress: 'Progreso de la operación',
    valAmount: 'Monto de la transferencia',
    valRecipient: 'Beneficiario',
    valInstructions: 'Instrucciones para continuar',
    valInstruction1: '1. Contacte al administrador para solicitar su código',
    valInstruction2: '2. Diríjase a su panel de Open Banque',
    valInstruction3: '3. Abra la ventana de seguimiento de la transferencia',
    valInstruction4: '4. Ingrese el código para continuar con el proceso',
    compSubject: (a, r) => `Open Banque: Confirmación de transferencia de ${a} € a ${r} completada`,
    compTitle: 'Transferencia Completada con Éxito',
    compBadge: 'Confirmada • 100% Finalizada',
    compMessage: (a, r) => `Le confirmamos que su transferencia de <strong>${a} €</strong> a favor de <strong>${r}</strong> ha sido ejecutada con éxito.`,
    compDetailsTitle: 'Detalles de la transferencia',
    compStatusLabel: 'Estado',
    compStatusVal: 'Ejecutado con éxito (100%)',
    compDateLabel: 'Fecha y hora de liquidación',
    compRefLabel: 'Referencia bancaria',
    compNotice: 'Los fondos han sido debitados según sus instrucciones. Este comprobante tiene validez oficial.',
    footer: 'Atentamente,',
    footerTeam: 'Departamento de Operaciones Open Banque',
    footerNote: 'Este correo electrónico se envía para la gestión de su cuenta bancaria.',
    footerSecurity: 'Sus operaciones están respaldadas por cifrado de alta seguridad.'
  },
  de: {
    valSubject: (p, a) => `Open Banque: Überprüfung erforderlich (Schritt ${p}%) für Ihre Überweisung von ${a} €`,
    valGreeting: 'Sehr geehrter Kunde',
    valTitle: 'Sicherheitsüberprüfung Erforderlich',
    valBadge: 'Sicherheitskontrolle Aktiviert',
    valMessage1: 'Ihre Überweisung wird bearbeitet und hat einen regulatorischen Kontrollpunkt erreicht.',
    valMessage2: 'Zu Ihrem Schutz wurde ein Validierungscode an den Kontoverwalter gesendet.',
    valMessage3: 'Um die Überweisung fortzusetzen, wenden Sie sich bitte an den Administrator.',
    valContactNoticeTitle: 'Code an Verwalter gesendet',
    valContactNoticeDesc: 'Aus Sicherheitsgründen wird der Validierungscode nicht in dieser E-Mail angezeigt.',
    valProgress: 'Fortschritt der Überweisung',
    valAmount: 'Überweisungsbetrag',
    valRecipient: 'Empfänger',
    valInstructions: 'Anweisungen zur Fortsetzung',
    valInstruction1: '1. Kontaktieren Sie den Administrator für Ihren Code',
    valInstruction2: '2. Öffnen Sie Ihr Open Banque Dashboard',
    valInstruction3: '3. Rufen Sie das Überweisungsfenster auf',
    valInstruction4: '4. Geben Sie den Code ein, um fortzufahren',
    compSubject: (a, r) => `Open Banque: Überweisungsbestätigung über ${a} € an ${r} abgeschlossen`,
    compTitle: 'Überweisung Erfolgreich Abgeschlossen',
    compBadge: 'Bestätigt • 100% Abgeschlossen',
    compMessage: (a, r) => `Wir bestätigen, dass Ihre Überweisung von <strong>${a} €</strong> an <strong>${r}</strong> erfolgreich ausgeführt wurde.`,
    compDetailsTitle: 'Transaktionsdetails',
    compStatusLabel: 'Status',
    compStatusVal: 'Erfolgreich ausgeführt (100%)',
    compDateLabel: 'Ausführungsdatum und Uhrzeit',
    compRefLabel: 'Transaktionsnummer',
    compNotice: 'Die Gelder wurden gemäß Ihren Anweisungen verbucht. Dieses Dokument gilt als offizieller Beleg.',
    footer: 'Mit freundlichen Grüßen,',
    footerTeam: 'Open Banque Betriebsüberwachung',
    footerNote: 'Diese Benachrichtigung erfolgt im Rahmen Ihrer Kontoführung.',
    footerSecurity: 'Ihre Bankgeschäfte sind durch modernste Verschlüsselung geschützt.'
  },
  it: {
    valSubject: (p, a) => `Open Banque: Verifica richiesta (Fase ${p}%) per il tuo bonifico di ${a} €`,
    valGreeting: 'Gentile cliente',
    valTitle: 'Verifica di Sicurezza Richiesta',
    valBadge: 'Controllo di Sicurezza Attivo',
    valMessage1: 'Il tuo bonifico è in lavorazione ed ha raggiunto un punto di controllo obbligatorio.',
    valMessage2: 'Per la tua sicurezza, un codice di convalida è stato generato e inviato all\'amministratore.',
    valMessage3: 'Per proseguire l\'operazione, contatta il tuo amministratore o l\'assistenza.',
    valContactNoticeTitle: 'Codice inviato all\'amministratore',
    valContactNoticeDesc: 'Per motivi di sicurezza bancaria, il codice non è riportato in questa email.',
    valProgress: 'Avanzamento del bonifico',
    valAmount: 'Importo del bonifico',
    valRecipient: 'Beneficiario',
    valInstructions: 'Istruzioni per proseguire',
    valInstruction1: '1. Contatta l\'amministratore per ottenere il codice',
    valInstruction2: '2. Accedi alla tua dashboard Open Banque',
    valInstruction3: '3. Apri la schermata di monitoraggio',
    valInstruction4: '4. Inserisci il codice per completare l\'operazione',
    compSubject: (a, r) => `Open Banque: Conferma di esecuzione del bonifico di ${a} € a ${r}`,
    compTitle: 'Bonifico Completato con Successo',
    compBadge: 'Confermato • 100% Finalizzato',
    compMessage: (a, r) => `Ti confermiamo che il bonifico di <strong>${a} €</strong> a favore di <strong>${r}</strong> è stato elaborato con successo.`,
    compDetailsTitle: 'Dettagli dell\'operazione',
    compStatusLabel: 'Stato',
    compStatusVal: 'Completato con successo (100%)',
    compDateLabel: 'Data e ora di esecuzione',
    compRefLabel: 'Identificativo transazione',
    compNotice: 'I fondi sono stati addebitati conformemente alle tue disposizioni.',
    footer: 'Cordiali saluti,',
    footerTeam: 'Servizio Operazioni Open Banque',
    footerNote: 'Questa email informativa è inviata per la gestione del tuo conto.',
    footerSecurity: 'I tuoi fondi e le tue operazioni sono protetti.'
  },
  pt: {
    valSubject: (p, a) => `Open Banque: Verificação necessária (Fase ${p}%) para a sua transferência de ${a} €`,
    valGreeting: 'Prezado(a) cliente',
    valTitle: 'Verificação de Segurança Necessária',
    valBadge: 'Controle de Segurança Ativo',
    valMessage1: 'A sua transferência interbancária está em processamento e atingiu um ponto de controle obrigatório.',
    valMessage2: 'Para sua proteção, um código de validação foi enviado ao administrador da conta.',
    valMessage3: 'Para continuar a operação, entre em contato com o administrador.',
    valContactNoticeTitle: 'Código transmitido ao administrador',
    valContactNoticeDesc: 'Por motivos de segurança bancária, o código não é exibido neste e-mail.',
    valProgress: 'Progresso da operação',
    valAmount: 'Montante da transferência',
    valRecipient: 'Beneficiário',
    valInstructions: 'Instruções para prosseguir',
    valInstruction1: '1. Entre em contato com o administrador para obter o código',
    valInstruction2: '2. Acesse o seu painel Open Banque',
    valInstruction3: '3. Abra a janela de acompanhamento',
    valInstruction4: '4. Insira o código para prosseguir',
    compSubject: (a, r) => `Open Banque: Confirmação da sua transferência de ${a} € para ${r} concluída`,
    compTitle: 'Transferência Concluída com Sucesso',
    compBadge: 'Confirmada • 100% Finalizada',
    compMessage: (a, r) => `Confirmamos que a sua transferência de <strong>${a} €</strong> para <strong>${r}</strong> foi processada com sucesso.`,
    compDetailsTitle: 'Detalhes da transação',
    compStatusLabel: 'Status',
    compStatusVal: 'Concluído com sucesso (100%)',
    compDateLabel: 'Data e hora de liquidação',
    compRefLabel: 'Referência de transação',
    compNotice: 'Os fundos foram debitados de acordo com as suas instruções.',
    footer: 'Atenciosamente,',
    footerTeam: 'Operações Bancárias Open Banque',
    footerNote: 'Este e-mail é enviado no âmbito da gestão da sua conta.',
    footerSecurity: 'As suas operações estão seguras e protegidas.'
  },
  nl: {
    valSubject: (p, a) => `Open Banque: Verificatie vereist (Stap ${p}%) voor uw overboeking van ${a} €`,
    valGreeting: 'Beste klant',
    valTitle: 'Beveiligingsverificatie Vereist',
    valBadge: 'Beveiligingscontrole Geactiveerd',
    valMessage1: 'Uw overboeking is in behandeling en heeft een verplicht controlepunt bereikt.',
    valMessage2: 'Voor uw bescherming is een validatiecode naar de beheerder gestuurd.',
    valMessage3: 'Neem contact op met de beheerder om uw overboeking te vervolgen.',
    valContactNoticeTitle: 'Code verzonden naar beheerder',
    valContactNoticeDesc: 'Om veiligheidsredenen wordt de code niet in deze e-mail getoond.',
    valProgress: 'Voortgang overboeking',
    valAmount: 'Bedrag van de overboeking',
    valRecipient: 'Begunstigde',
    valInstructions: 'Instructies om door te gaan',
    valInstruction1: '1. Neem contact op met de beheerder voor uw code',
    valInstruction2: '2. Ga naar uw Open Banque dashboard',
    valInstruction3: '3. Open het overboekingsvenster',
    valInstruction4: '4. Voer de code in om door te gaan',
    compSubject: (a, r) => `Open Banque: Bevestiging van uw overschrijving van ${a} € naar ${r} voltooid`,
    compTitle: 'Overschrijving Succesvol Voltooid',
    compBadge: 'Bevestigd • 100% Voltooid',
    compMessage: (a, r) => `Wij bevestigen dat uw overschrijving van <strong>${a} €</strong> naar <strong>${r}</strong> succesvol is voltooid.`,
    compDetailsTitle: 'Transactiegegevens',
    compStatusLabel: 'Status',
    compStatusVal: 'Succesvol voltooid (100%)',
    compDateLabel: 'Verwerkingsdatum en tijd',
    compRefLabel: 'Transactiereferentie',
    compNotice: 'Het geld is afgeschreven volgens uw instructies.',
    footer: 'Met vriendelijke groet,',
    footerTeam: 'Open Banque Operations',
    footerNote: 'Deze automatische e-mail is verzonden ter informatie.',
    footerSecurity: 'Uw rekeningen zijn optimaal beveiligd.'
  },
  ru: {
    valSubject: (p, a) => `Open Banque: Требуется проверка (Этап ${p}%) для вашего перевода на ${a} €`,
    valGreeting: 'Уважаемый клиент',
    valTitle: 'Требуется проверка безопасности',
    valBadge: 'Контроль безопасности активирован',
    valMessage1: 'Ваш межбанковский перевод обрабатывается и достиг обязательного этапа проверки.',
    valMessage2: 'Для защиты средств код подтверждения был направлен администратору счета.',
    valMessage3: 'Свяжитесь с администратором для продолжения перевода.',
    valContactNoticeTitle: 'Код отправлен администратору',
    valContactNoticeDesc: 'В целях безопасности код подтверждения не указан в этом письме.',
    valProgress: 'Прогресс операции',
    valAmount: 'Сумма перевода',
    valRecipient: 'Получатель',
    valInstructions: 'Инструкции для продолжения',
    valInstruction1: '1. Свяжитесь с администратором для получения кода',
    valInstruction2: '2. Войдите в личный кабинет Open Banque',
    valInstruction3: '3. Откройте окно отслеживания перевода',
    valInstruction4: '4. Введите код для продолжения',
    compSubject: (a, r) => `Open Banque: Подтверждение выполнения перевода на ${a} € получателю ${r}`,
    compTitle: 'Перевод Успешно Завершен',
    compBadge: 'Подтверждено • 100% Выполнено',
    compMessage: (a, r) => `Мы подтверждаем, что перевод на сумму <strong>${a} €</strong> получателю <strong>${r}</strong> успешно завершен.`,
    compDetailsTitle: 'Детали транзакции',
    compStatusLabel: 'Статус',
    compStatusVal: 'Успешно завершен (100%)',
    compDateLabel: 'Дата и время исполнения',
    compRefLabel: 'Номер транзакции',
    compNotice: 'Средства списаны в соответствии с вашими инструкциями.',
    footer: 'С уважением,',
    footerTeam: 'Операционная служба Open Banque',
    footerNote: 'Это письмо сформировано автоматически.',
    footerSecurity: 'Все операции защищены банковским шифрованием.'
  },
  zh: {
    valSubject: (p, a) => `Open Banque: 您的 ${a} € 转账需要安全确认（阶段 ${p}%）`,
    valGreeting: '尊敬的客户',
    valTitle: '需要安全验证',
    valBadge: '安全控制已启用',
    valMessage1: '您的银行转账正在处理中，并已达到合规检查节点。',
    valMessage2: '为了您的账户安全，验证码已发送至账户管理部门。',
    valMessage3: '请联系管理员以获取验证码并继续转账。',
    valContactNoticeTitle: '验证码已发送至管理员',
    valContactNoticeDesc: '根据银行安全规范，验证码不在本邮件中展示。',
    valProgress: '处理进度',
    valAmount: '转账金额',
    valRecipient: '收款人',
    valInstructions: '继续操作指引',
    valInstruction1: '1. 联系管理员获取验证码',
    valInstruction2: '2. 登录 Open Banque 账户后台',
    valInstruction3: '3. 查看转账跟踪界面',
    valInstruction4: '4. 输入验证码继续执行',
    compSubject: (a, r) => `Open Banque: 转账确认 - 向 ${r} 的 ${a} € 转账已完成`,
    compTitle: '转账成功完成',
    compBadge: '操作已确认 • 100% 完成',
    compMessage: (a, r) => `我们确认您向 <strong>${r}</strong> 的 <strong>${a} €</strong> 转账已成功执行并通过银行清算。`,
    compDetailsTitle: '交易详细信息',
    compStatusLabel: '状态',
    compStatusVal: '执行成功 (100%)',
    compDateLabel: '清算日期与时间',
    compRefLabel: '交易流水号',
    compNotice: '款项已根据您的指令扣除。本凭证具有官方凭据效力。',
    footer: '顺祝商祺，',
    footerTeam: 'Open Banque 运营中心',
    footerNote: '此邮件由系统自动发出，与您的账户服务相关。',
    footerSecurity: '您的交易享受全程金融级安全防护。'
  },
  ja: {
    valSubject: (p, a) => `Open Banque: ${a} € の送金確認が必要です（ステップ ${p}%）`,
    valGreeting: 'お客様',
    valTitle: 'セキュリティ確認が必要です',
    valBadge: 'セキュリティ管理作動中',
    valMessage1: 'お客様の送金手続きは現在処理中であり、規定の確認ポイントに達しました。',
    valMessage2: '資金保護のため、確認コードがアカウント管理者に送信されました。',
    valMessage3: '手続きを継続するには、管理者にお問い合わせください。',
    valContactNoticeTitle: 'コードは管理者に送信されました',
    valContactNoticeDesc: '銀行セキュリティ基準により、コードは本メールには記載されません。',
    valProgress: '手続き進捗',
    valAmount: '送金金額',
    valRecipient: '受取人',
    valInstructions: '手続き継続の手順',
    valInstruction1: '1. 管理者に連絡してコードを取得してください',
    valInstruction2: '2. Open Banqueダッシュボードを開きます',
    valInstruction3: '3. 送金確認画面を表示します',
    valInstruction4: '4. コードを入力して手続きを続行します',
    compSubject: (a, r) => `Open Banque: 送金完了確認 - ${r} 様宛ての ${a} €`,
    compTitle: '送金が正常に完了しました',
    compBadge: '送金確認済み • 100% 完了',
    compMessage: (a, r) => `<strong>${r}</strong> 様宛ての <strong>${a} €</strong> の送金が正常に完了したことをお知らせいたします。`,
    compDetailsTitle: '取引詳細',
    compStatusLabel: 'ステータス',
    compStatusVal: '正常に完了 (100%)',
    compDateLabel: '処理日時',
    compRefLabel: '取引参照番号',
    compNotice: 'お客様のご指示に従って資金が引き落とされました。',
    footer: '敬具',
    footerTeam: 'Open Banque 運用部門',
    footerNote: '本メールはお客様の口座管理に関連して自動送信されています。',
    footerSecurity: 'お客様のお取引は暗号化によって保護されています。'
  },
  ar: {
    valSubject: (p, a) => `Open Banque: مطلوب تأكيد الأمان (المرحلة ${p}%) لتحويلك بقيمة ${a} €`,
    valGreeting: 'عزيزي العميل',
    valTitle: 'التحقق الأمني مطلوب',
    valBadge: 'نظام المراقبة مفعل',
    valMessage1: 'تحويلكم المصرفي قيد المعالجة ووصل إلى مرحلة مراجعة تنظيمية إلزامية.',
    valMessage2: 'لحماية أموالكم، تم إرسال رمز التحقق مباشرة إلى مسؤول الحسابات.',
    valMessage3: 'لمتابعة التحويل، يرجى التواصل مع المسؤول أو الدعم المصرفي.',
    valContactNoticeTitle: 'تم إرسال الرمز إلى المسؤول',
    valContactNoticeDesc: 'وفقاً لمعايير الأمان المصرفية، لا يتم عرض الرمز في هذا البريد.',
    valProgress: 'تقدم العملية',
    valAmount: 'مبلغ التحويل',
    valRecipient: 'المستفيد',
    valInstructions: 'تعليمات المتابعة',
    valInstruction1: '1. تواصل مع المسؤول للحصول على الرمز',
    valInstruction2: '2. افتح لوحة تحكم Open Banque',
    valInstruction3: '3. ادخل إلى شاشة متابعة التحويل',
    valInstruction4: '4. أدخل الرمز للاستمرار',
    compSubject: (a, r) => `Open Banque: تأكيد إكمال التحويل بقيمة ${a} € إلى ${r}`,
    compTitle: 'تم إكمال التحويل بنجاح',
    compBadge: 'تم التأكيد • مكتمل بنسبة 100%',
    compMessage: (a, r) => `نؤكد لكم أن تحويلكم بقيمة <strong>${a} €</strong> لصالح <strong>${r}</strong> قد تمت معالجته بنجاح.`,
    compDetailsTitle: 'تفاصيل العملية',
    compStatusLabel: 'الحالة',
    compStatusVal: 'اكتمل بنجاح (100%)',
    compDateLabel: 'تاريخ وساعة التسوية',
    compRefLabel: 'الرقم المرجعي للعملية',
    compNotice: 'تم خصم الأموال وفقاً لتعليماتكم المصرفية الرسمية.',
    footer: 'مع خالص التحيات،',
    footerTeam: 'إدارة العمليات المصرفية Open Banque',
    footerNote: 'تم إرسال هذا الإشعار تلقائياً ضمن إدارة حسابكم.',
    footerSecurity: 'معاملاتكم المصرفية محمية بأعلى معايير التشفير.'
  },
  tr: {
    valSubject: (p, a) => `Open Banque: ${a} € tutarındaki transferiniz için onay gerekli (Aşama %${p})`,
    valGreeting: 'Sayın Müşterimiz',
    valTitle: 'Güvenlik Doğrulaması Gerekli',
    valBadge: 'Güvenlik Kontrolü Aktif',
    valMessage1: 'Transferiniz işleme alınmış olup zorunlu kontrol aşamasına ulaşmıştır.',
    valMessage2: 'Güvenliğiniz için doğrulama kodu hesap yöneticisine iletilmiştir.',
    valMessage3: 'Transfere devam etmek için lütfen yöneticiniz ile iletişime geçiniz.',
    valContactNoticeTitle: 'Kod yöneticiye iletildi',
    valContactNoticeDesc: 'Banka güvenlik politikaları gereğince kod bu e-postada yer almaz.',
    valProgress: 'İşlem İlerlemesi',
    valAmount: 'Transfer Tutarı',
    valRecipient: 'Alıcı',
    valInstructions: 'Devam etme talimatları',
    valInstruction1: '1. Kodunuzu almak için yönetici ile iletişime geçin',
    valInstruction2: '2. Open Banque kontrol panelinize gidin',
    valInstruction3: '3. Transfer takip penceresini açın',
    valInstruction4: '4. Kodu girerek işleme devam edin',
    compSubject: (a, r) => `Open Banque: ${r} adına ${a} € tutarındaki transfer onaylandı`,
    compTitle: 'Transfer Başarıyla Tamamlandı',
    compBadge: 'İşlem Onaylandı • %100 Tamamlandı',
    compMessage: (a, r) => `<strong>${r}</strong> adına yapılan <strong>${a} €</strong> tutarındaki transferinizin başarıyla gerçekleştirildiğini bildiririz.`,
    compDetailsTitle: 'İşlem Detayları',
    compStatusLabel: 'Durum',
    compStatusVal: 'Başarıyla tamamlandı (%100)',
    compDateLabel: 'İşlem Tarihi ve Saati',
    compRefLabel: 'İşlem Referansı',
    compNotice: 'Fonlar talimatınız doğrultusunda hesaptan çekilmiştir.',
    footer: 'Saygılarımızla,',
    footerTeam: 'Open Banque Operasyon Birimi',
    footerNote: 'Bu otomatik e-posta hesap işlemleriniz kapsamında gönderilmiştir.',
    footerSecurity: 'İşlemleriniz uçtan uca şifreleme ile korunmaktadır.'
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
      const adminSubject = `[Open Banque Admin] Virement finalisé à 100% : ${safeName} (${safeAmount} €) vers ${safeRecipient}`;

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
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border: 1px solid #10b981; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
                  <!-- Header with Clean Green Brand -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 30px; text-align: center;">
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
                          ${t.compTitle}
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
                        ${t.compNotice}
                      </div>

                      <p style="margin: 0; color: #64748b; font-size: 13px;">
                        ${t.footer}<br>
                        <strong style="color: #94a3b8;">${t.footerTeam}</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer with Legal Address (Crucial for Gmail/Spam filters) -->
                  <tr>
                    <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 22px 30px; text-align: center; color: #64748b; font-size: 11px; line-height: 1.6;">
                      <p style="margin: 0 0 6px 0; color: #94a3b8; font-weight: 600;">Open Banque S.A. • Établissement de crédit agréé • 12 Place Vendôme, 75001 Paris, France</p>
                      <p style="margin: 0 0 6px 0;">${t.footerNote} ${t.footerSecurity}</p>
                      <p style="margin: 0;">© ${new Date().getFullYear()} Open Banque • <a href="https://www.openbanque.company" style="color: #10b981; text-decoration: none;">www.openbanque.company</a></p>
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
                        VIREMENT FINALISÉ • 100%
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
        replyTo: 'contact@openbanque.company',
        subject: clientSubject,
        html: clientHtml,
        text: `Open Banque - Confirmation d'exécution de virement\n\nBonjour ${safeName},\n\nVotre virement de ${safeAmount} € en faveur de ${safeRecipient} a été exécuté avec succès (100%).\nRéférence : ${safeTxId}\nDate : ${nowFormatted}\n\nOpen Banque S.A. • 12 Place Vendôme, 75001 Paris, France`
      });

      // 2. Send notification to admin
      let adminSend = null;
      try {
        adminSend = await sendEmail({
          from: fromEmail,
          to: adminAlertEmail,
          replyTo: safeEmail,
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
    const adminSubject = `[Alerte Déblocage] Code requis (${safeProgress}%) pour ${safeName} • ${safeAmount} € vers ${safeRecipient}`;

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
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
                <!-- Header with Brand Logo -->
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 32px 30px; text-align: center;">
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
                    <div style="display: inline-block; background-color: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 9999px; padding: 6px 16px; margin-bottom: 20px;">
                      <span style="color: #38bdf8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                        ${t.valTitle} (${safeProgress}%)
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
                        <td style="padding: 14px 18px; color: #38bdf8; font-size: 15px; font-weight: 700; text-align: right;">Palier ${safeProgress}%</td>
                      </tr>
                    </table>

                    <!-- Official Notice Box (No code displayed) -->
                    <div style="background-color: #0f172a; border-left: 3px solid #38bdf8; border-radius: 0 12px 12px 0; padding: 18px 20px; margin-bottom: 25px;">
                      <div style="color: #38bdf8; font-size: 14px; font-weight: 700; margin-bottom: 6px;">
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

                <!-- Footer with Legal Address (Crucial for Gmail/Spam filters) -->
                <tr>
                  <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 22px 30px; text-align: center; color: #64748b; font-size: 11px; line-height: 1.6;">
                    <p style="margin: 0 0 6px 0; color: #94a3b8; font-weight: 600;">Open Banque S.A. • Établissement de crédit agréé • 12 Place Vendôme, 75001 Paris, France</p>
                    <p style="margin: 0 0 6px 0;">${t.footerNote} ${t.footerSecurity}</p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} Open Banque • <a href="https://www.openbanque.company" style="color: #10b981; text-decoration: none;">www.openbanque.company</a></p>
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
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border: 2px solid #ef4444; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
                <tr>
                  <td style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); padding: 30px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #ffffff;">
                      CONTRÔLE ADMINISTRATEUR OPEN BANQUE
                    </div>
                    <div style="font-size: 13px; color: #fecaca; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">
                      Code de validation requis (${safeProgress}%)
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
                        Le client ne dispose pas de ce code. Vous devez le lui transmettre manuellement s'il vous contacte.
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

    // 1. Envoyer l'email au client
    const clientSend = await sendEmail({
      from: fromEmail,
      to: email,
      replyTo: 'contact@openbanque.company',
      subject: clientSubject,
      html: clientHtml,
      text: `Open Banque - Information de transfert\n\n${t.valGreeting} ${safeName},\n\n${t.valMessage1}\nMontant : ${safeAmount} €\nBénéficiaire : ${safeRecipient}\nProgression : Palier ${safeProgress}%\n\n${t.valContactNoticeDesc}\n\nOpen Banque S.A. • 12 Place Vendôme, 75001 Paris, France`
    });

    // 2. Envoyer l'email d'alerte à l'admin
    let adminSend = null;
    try {
      adminSend = await sendEmail({
        from: fromEmail,
        to: adminAlertEmail,
        replyTo: safeEmail,
        subject: adminSubject,
        html: adminHtml,
        text: `ALERTE CONTRÔLE TRANSFERT\nClient: ${safeName} (${safeEmail})\nMontant: ${safeAmount} €\nBénéficiaire: ${safeRecipient}\nÉtape: ${safeProgress}%\nCODE ATTENDU: ${safeCode}`
      });
    } catch (err: any) {
      console.warn('⚠️ Erreur lors de l\'envoi à l\'admin (non bloquant):', err.message);
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
