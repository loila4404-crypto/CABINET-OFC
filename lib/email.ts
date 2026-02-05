// Утилита для отправки email уведомлений через nodemailer

import nodemailer from 'nodemailer'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Проверяем, настроены ли SMTP параметры
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || smtpUser

    // Если SMTP не настроен, логируем в консоль (для разработки)
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.log('📧 Email уведомление (SMTP не настроен, логирование):')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      console.log('Body:', options.text || options.html)
      console.log('\n💡 Для реальной отправки email настройте переменные окружения:')
      console.log('   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM')
      return true // Возвращаем true, чтобы не блокировать процесс
    }

    // Создаем транспортер для отправки email
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: smtpPort === '465', // true для 465, false для других портов
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Отправляем email
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    console.log('✅ Email отправлен:', info.messageId)
    return true
  } catch (error: any) {
    console.error('❌ Ошибка отправки email:', error.message)
    // В режиме разработки не блокируем процесс при ошибке отправки
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email уведомление (ошибка отправки, логирование):')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      return true
    }
    return false
  }
}

export function generateInvitationEmail(
  receiverEmail: string,
  senderEmail: string,
  invitationLink: string
): EmailOptions {
  return {
    to: receiverEmail,
    subject: `Приглашение в кабинет от ${senderEmail}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Приглашение в кабинет</h1>
            </div>
            <div class="content">
              <p>Здравствуйте!</p>
              <p><strong>${senderEmail}</strong> приглашает вас в свой кабинет.</p>
              <p>Вы получили доступ для просмотра и управления данными в кабинете.</p>
              <div style="text-align: center;">
                <a href="${invitationLink}" class="button">Принять приглашение</a>
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                Или скопируйте эту ссылку в браузер:<br/>
                <a href="${invitationLink}" style="color: #8B5CF6; word-break: break-all;">${invitationLink}</a>
              </p>
            </div>
            <div class="footer">
              <p>Это автоматическое уведомление от Reddit Cabinet</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Приглашение в кабинет

Здравствуйте!

${senderEmail} приглашает вас в свой кабинет.

Вы получили доступ для просмотра и управления данными в кабинете.

Принять приглашение: ${invitationLink}

Это автоматическое уведомление от Reddit Cabinet
    `.trim(),
  }
}

