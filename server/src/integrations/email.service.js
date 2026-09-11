import axios from 'axios';

import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import {
  createEmailTemplate,
  createPlainTextEmail,
} from './email-template.js';
const BREVO_API_URL =
  'https://api.brevo.com/v3/smtp/email';

const DEFAULT_TIMEOUT_MS = 20_000;

const escapeHtml = (value) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const stripHtml = (html) => {
  return String(html ?? '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeRecipients = (to) => {
  const recipients = Array.isArray(to)
    ? to
    : [to];

  return recipients
    .map((recipient) => {
      if (typeof recipient === 'string') {
        return {
          email: recipient.trim(),
        };
      }

      if (
        recipient &&
        typeof recipient === 'object'
      ) {
        return {
          email: String(
            recipient.email ?? ''
          ).trim(),

          ...(recipient.name
            ? {
                name: String(
                  recipient.name
                ).trim(),
              }
            : {}),
        };
      }

      return null;
    })
    .filter(
      (recipient) =>
        recipient?.email
    );
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email ?? '').trim()
  );
};

class EmailService {
  constructor() {
    this.isConfigured = Boolean(
      config.BREVO_API_KEY &&
      config.BREVO_SENDER_EMAIL
    );

    this.client = axios.create({
      baseURL: BREVO_API_URL,
      timeout:
        config.BREVO_TIMEOUT_MS ||
        DEFAULT_TIMEOUT_MS,

      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key':
          config.BREVO_API_KEY || '',
      },
    });

    if (this.isConfigured) {
      logger.info(
        'Brevo Email API yapılandırıldı',
        {
          senderName:
            config.BREVO_SENDER_NAME,
          senderEmail:
            config.BREVO_SENDER_EMAIL,
        }
      );
    } else {
      logger.warn(
        'Brevo Email API yapılandırması eksik',
        {
          hasApiKey: Boolean(
            config.BREVO_API_KEY
          ),
          hasSenderEmail: Boolean(
            config.BREVO_SENDER_EMAIL
          ),
        }
      );
    }
  }

  ensureConfigured() {
    if (!this.isConfigured) {
      const error = new Error(
        'E-posta servisi yapılandırılmamış.'
      );

      error.code =
        'EMAIL_SERVICE_NOT_CONFIGURED';

      throw error;
    }
  }

  validateEmailPayload({
    to,
    subject,
    html,
    text,
  }) {
    const recipients =
      normalizeRecipients(to);

    if (recipients.length === 0) {
      const error = new Error(
        'En az bir geçerli e-posta alıcısı zorunludur.'
      );

      error.code =
        'INVALID_EMAIL_RECIPIENT';

      throw error;
    }

    const invalidRecipient =
      recipients.find(
        (recipient) =>
          !isValidEmail(
            recipient.email
          )
      );

    if (invalidRecipient) {
      const error = new Error(
        `Geçersiz e-posta adresi: ${invalidRecipient.email}`
      );

      error.code =
        'INVALID_EMAIL_ADDRESS';

      throw error;
    }

    if (
      typeof subject !== 'string' ||
      !subject.trim()
    ) {
      const error = new Error(
        'E-posta konusu zorunludur.'
      );

      error.code =
        'INVALID_EMAIL_SUBJECT';

      throw error;
    }

    if (
      !String(html ?? '').trim() &&
      !String(text ?? '').trim()
    ) {
      const error = new Error(
        'E-posta içeriği zorunludur.'
      );

      error.code =
        'INVALID_EMAIL_CONTENT';

      throw error;
    }

    return recipients;
  }

  async sendEmail({
    to,
    subject,
    html,
    text,
    replyTo,
    tags,
  }) {
    this.ensureConfigured();

    const recipients =
      this.validateEmailPayload({
        to,
        subject,
        html,
        text,
      });

    const normalizedSubject =
      subject.trim().slice(0, 998);

    const htmlContent =
      String(html ?? '').trim() ||
      `<p>${escapeHtml(text)}</p>`;

    const textContent =
      String(text ?? '').trim() ||
      stripHtml(htmlContent);

    const payload = {
      sender: {
        name:
          config.BREVO_SENDER_NAME ||
          'Derkenar Hukuk Bürosu Yönetim Sistemi',

        email:
          config.BREVO_SENDER_EMAIL,
      },

      to: recipients,

      subject:
        normalizedSubject,

      htmlContent,
      textContent,

      ...(replyTo?.email &&
      isValidEmail(replyTo.email)
        ? {
            replyTo: {
              email:
                replyTo.email.trim(),

              ...(replyTo.name
                ? {
                    name:
                      String(
                        replyTo.name
                      ).trim(),
                  }
                : {}),
            },
          }
        : {}),

      ...(Array.isArray(tags) &&
      tags.length > 0
        ? {
            tags: tags
              .map((tag) =>
                String(tag).trim()
              )
              .filter(Boolean)
              .slice(0, 10),
          }
        : {}),
    };

    const startedAt = Date.now();

    try {
      const response =
        await this.client.post(
          '',
          payload
        );

      logger.info(
        'E-posta başarıyla gönderildi',
        {
          recipients:
            recipients.map(
              (recipient) =>
                recipient.email
            ),

          subject:
            normalizedSubject,

          messageId:
            response.data?.messageId ||
            null,

          durationMs:
            Date.now() -
            startedAt,
        }
      );

      return {
        success: true,

        messageId:
          response.data?.messageId ||
          null,

        recipients:
          recipients.map(
            (recipient) =>
              recipient.email
          ),

        durationMs:
          Date.now() -
          startedAt,
      };
    } catch (error) {
      const responseData =
        error.response?.data || null;

      const statusCode =
        error.response?.status ||
        null;

      const errorMessage =
        responseData?.message ||
        responseData?.code ||
        error.message ||
        'Brevo e-posta gönderimi başarısız.';

      logger.error(
        'Brevo e-posta gönderim hatası',
        {
          recipients:
            recipients.map(
              (recipient) =>
                recipient.email
            ),

          subject:
            normalizedSubject,

          statusCode,

          errorCode:
            responseData?.code ||
            error.code ||
            null,

          message:
            errorMessage,

          durationMs:
            Date.now() -
            startedAt,
        }
      );

      const emailError =
        new Error(
          `E-posta gönderilemedi: ${errorMessage}`
        );

      emailError.name =
        'EmailServiceError';

      emailError.code =
        responseData?.code ||
        error.code ||
        'EMAIL_SEND_FAILED';

      emailError.statusCode =
        statusCode || 502;

      emailError.retryable =
        !statusCode ||
        statusCode === 408 ||
        statusCode === 429 ||
        statusCode >= 500;

      emailError.cause = error;

      throw emailError;
    }
  }

  async sendWelcomeEmail(user) {
  if (!user?.email || !user?.email_verification_token) {
    throw new Error(
      'Hoş geldiniz e-postası için kullanıcı e-postası ve doğrulama tokenı zorunludur.'
    );
  }

  const verificationUrl =
    `${config.CLIENT_URL}/verify-email?token=${encodeURIComponent(
      user.email_verification_token
    )}`;

  const templateData = {
    title: "Derkenar'a Hoş Geldiniz",
    greeting: `Merhaba ${user.first_name || 'Kullanıcı'},`,
    paragraphs: [
      "Derkenar Hukuk Bürosu Yönetim Sistemi'ne kaydınız başarıyla oluşturuldu.",
      'Hesabınızı etkinleştirmek için aşağıdaki bağlantıyı kullanabilirsiniz.',
    ],
    button: {
      label: 'Hesabı Etkinleştir',
      url: verificationUrl,
    },
  };

  return this.sendEmail({
    to: user.email,
    subject: 'Derkenar hesabınızı etkinleştirin',
    html: createEmailTemplate(templateData),
    text: createPlainTextEmail(templateData),
    tags: [
      'welcome',
      'email-verification',
    ],
  });
}
  
  async sendPasswordResetEmail(user, token) {
  if (!user?.email || !token) {
    throw new Error(
      'Şifre sıfırlama e-postası için kullanıcı e-postası ve token zorunludur.'
    );
  }

  const resetUrl =
    `${config.CLIENT_URL}/reset-password?token=${encodeURIComponent(
      token
    )}`;

  const templateData = {
    title: 'Şifre Sıfırlama',
    greeting: `Merhaba ${user.first_name || 'Kullanıcı'},`,
    paragraphs: [
      'Derkenar hesabınız için şifre sıfırlama talebi alındı.',
    ],
    warning:
      'Bu bağlantı 1 saat boyunca geçerlidir. Bu talebi siz oluşturmadıysanız e-postayı yok sayabilirsiniz.',
    button: {
      label: 'Şifremi Sıfırla',
      url: resetUrl,
    },
  };

  return this.sendEmail({
    to: user.email,
    subject: 'Derkenar şifre sıfırlama talebi',
    html: createEmailTemplate(templateData),
    text: createPlainTextEmail(templateData),
    tags: ['password-reset'],
  });
}

  async sendNotification(
  user,
  title,
  message,
  link = null
) {
  if (!user?.email) {
    throw new Error(
      'Bildirim e-postası için kullanıcı e-posta adresi zorunludur.'
    );
  }

  if (!title?.trim()) {
    throw new Error(
      'Bildirim e-postası başlığı zorunludur.'
    );
  }

  if (!message?.trim()) {
    throw new Error(
      'Bildirim e-postası mesajı zorunludur.'
    );
  }

  const absoluteLink =
    link && /^https?:\/\//i.test(link)
      ? link
      : link
        ? `${config.CLIENT_URL}${link}`
        : null;

  const templateData = {
    title: title.trim(),
    greeting: `Merhaba ${user.first_name || 'Kullanıcı'},`,
    paragraphs: [
      message.trim(),
    ],
    ...(absoluteLink
      ? {
          button: {
            label: 'Detayları Görüntüle',
            url: absoluteLink,
          },
        }
      : {}),
  };

  return this.sendEmail({
    to: user.email,
    subject: title.trim(),
    html: createEmailTemplate(templateData),
    text: createPlainTextEmail(templateData),
    tags: ['notification'],
  });
}
}
export const emailService =
  new EmailService();

export default emailService;