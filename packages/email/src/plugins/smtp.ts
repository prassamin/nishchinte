import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { EmailPlugin, EmailMessage, EmailSendResult, SMTPConfig } from "../types";

/**
 * Creates an SMTP email plugin powered by Nodemailer.
 *
 * Compatible with any standard RFC 5321 / RFC 5322 compliant mail transfer agent (MTA), including:
 * - Google Workspace / Gmail (via App Passwords)
 * - Zoho Mail
 * - Amazon Simple Email Service (SES)
 * - Brevo / Sendinblue
 * - Mailgun / Postmark SMTP relays
 * - Self-hosted Postfix / Exim / cPanel mailboxes
 * - Local development servers (MailHog, Mailpit, InBucket)
 *
 * @param config - The {@link SMTPConfig} object containing host, port, credentials, and TLS options.
 * @returns An {@link EmailPlugin} instance configured for SMTP transport.
 *
 * @example
 * ```typescript
 * import { smtpEmail } from "@nishchinte/email";
 *
 * const smtp = smtpEmail({
 *   host: "smtp.gmail.com",
 *   port: 465,
 *   secure: true,
 *   auth: {
 *     user: "admin@mystore.com",
 *     pass: "xxxx-xxxx-xxxx-xxxx", // 16-character App Password
 *   },
 *   from: "My Store <noreply@mystore.com>",
 * });
 * ```
 */
export function smtpEmail(config: SMTPConfig): EmailPlugin {
  let transporter: Transporter | null = null;

  /**
   * Lazily initializes and caches the Nodemailer transporter instance.
   */
  function getTransporter(): Transporter {
    if (!transporter) {
      if (config.service) {
        transporter = nodemailer.createTransport({
          service: config.service,
          auth: config.auth,
        });
      } else {
        const port = config.port ?? (config.secure ? 465 : 587);
        const secure = config.secure ?? (port === 465);

        transporter = nodemailer.createTransport({
          host: config.host,
          port,
          secure,
          auth: config.auth,
          tls: config.tls ?? {
            rejectUnauthorized: false,
          },
        });
      }
    }
    return transporter;
  }

  return {
    name: "smtp",
    defaultFrom: config.from || config.auth.user,

    /**
     * Sends an email via SMTP.
     *
     * Converts the standardized {@link EmailMessage} format into Nodemailer mail options,
     * including multipart HTML/plaintext bodies and file attachments.
     *
     * @param message - The email message to dispatch.
     * @returns A promise resolving to an {@link EmailSendResult}.
     */
    async send(message: EmailMessage): Promise<EmailSendResult> {
      try {
        const mailer = getTransporter();
        const from = message.from || config.from || config.auth.user;

        if (!from) {
          return {
            success: false,
            error: "No 'from' address configured for SMTP email plugin",
            provider: "smtp",
          };
        }

        const info = await mailer.sendMail({
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          replyTo: message.replyTo,
          cc: message.cc,
          bcc: message.bcc,
          attachments: message.attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
            path: att.path,
            contentType: att.contentType,
            cid: att.cid,
          })),
        });

        return {
          success: true,
          messageId: info.messageId,
          provider: "smtp",
        };
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || "Failed to send email via SMTP",
          provider: "smtp",
        };
      }
    },

    /**
     * Verifies the SMTP connection and authentication credentials without sending an email.
     *
     * ### How it works:
     * Calls Nodemailer's `transporter.verify()`, which:
     * 1. Connects to the remote SMTP server on the configured `host` and `port`.
     * 2. Handshakes via `HELO`/`EHLO` and negotiates encryption (TLS/STARTTLS).
     * 3. Executes `AUTH LOGIN` or `AUTH PLAIN` with `config.auth.user` and `config.auth.pass`.
     * 4. Closes the socket immediately upon confirmation.
     *
     * ### When to use:
     * - Admin UI "Test Connection" button.
     * - Server boot health checks.
     * - Automated configuration validation scripts.
     *
     * @returns A promise resolving to `{ success: true }` if credentials and server connection are valid,
     *          or `{ success: false, error: string }` if connection or authentication failed.
     */
    async verify(): Promise<{ success: boolean; error?: string }> {
      try {
        const mailer = getTransporter();
        await mailer.verify();
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || "SMTP connection verification failed",
        };
      }
    },
  };
}

