/**
 * Options for email file attachments.
 */
export interface EmailAttachment {
  /**
   * The filename displayed in the recipient's email client (e.g. "invoice.pdf", "receipt.png").
   */
  filename: string;

  /**
   * Binary or string content of the attachment.
   * Accepts raw strings, base64 strings, or Node.js `Buffer` objects.
   */
  content?: string | Buffer;

  /**
   * Absolute or relative filesystem path to the file to attach, or a public URL.
   * If provided, the email driver will stream or fetch the file content.
   */
  path?: string;

  /**
   * Explicit MIME content type for the attachment (e.g. "application/pdf", "image/png").
   * If omitted, providers typically infer it from the `filename` extension.
   */
  contentType?: string;

  /**
   * Content-ID (CID) for embedding inline images in HTML templates.
   * @example
   * ```html
   * <!-- HTML body -->
   * <img src="cid:company-logo" alt="Logo" />
   * ```
   * ```ts
   * attachments: [{ filename: "logo.png", path: "./logo.png", cid: "company-logo" }]
   * ```
   */
  cid?: string;
}

/**
 * Standard, provider-agnostic email payload accepted by all email plugins.
 */
export interface EmailMessage {
  /**
   * Recipient email address or a list of recipient email addresses.
   * @example "customer@example.com" or ["user1@example.com", "user2@example.com"]
   */
  to: string | string[];

  /**
   * Subject line of the email.
   */
  subject: string;

  /**
   * Full HTML body content of the email.
   */
  html: string;

  /**
   * Optional plaintext fallback version of the email for text-only email clients
   * and accessibility / anti-spam scoring.
   */
  text?: string;

  /**
   * Sender email address, optionally with a display name.
   * If omitted, the driver will fallback to the plugin's configured default `from` address.
   * @example "Acme Store <support@acmestore.com>"
   */
  from?: string;

  /**
   * Optional reply-to email address.
   * Directs user replies to a specific address instead of the sender address.
   */
  replyTo?: string;

  /**
   * Carbon Copy (CC) recipient(s).
   */
  cc?: string | string[];

  /**
   * Blind Carbon Copy (BCC) recipient(s).
   */
  bcc?: string | string[];

  /**
   * List of files or inline media to attach to this email.
   */
  attachments?: EmailAttachment[];
}

/**
 * Standardized execution result returned after attempting to send an email.
 */
export interface EmailSendResult {
  /**
   * Indicates whether the email was successfully accepted and dispatched by the provider.
   */
  success: boolean;

  /**
   * Unique message identifier assigned by the provider (e.g. SMTP queue ID or API message ID).
   */
  messageId?: string;

  /**
   * Human-readable error description if the operation failed.
   */
  error?: string;

  /**
   * Name identifier of the email provider plugin that processed the message (e.g. "smtp", "resend", "console").
   */
  provider: string;
}

/**
 * Core interface that every email driver/transport plugin must implement.
 *
 * Pluggable drivers (SMTP, Resend, Console, SendGrid, SES, etc.) implement this contract
 * to ensure interoperability and zero lock-in for the application.
 */
export interface EmailPlugin {
  /**
   * Unique identifier of the plugin driver (e.g. "smtp", "resend", "console", "postmark").
   */
  readonly name: string;

  /**
   * Default sender address configured for this plugin instance.
   */
  readonly defaultFrom?: string;

  /**
   * Dispatches an email message through the provider's network or API transport.
   *
   * @param message - The normalized email message payload to deliver.
   * @returns A promise resolving to a standardized {@link EmailSendResult}.
   */
  send(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Performs an end-to-end diagnostic check / health verification of the email provider.
   *
   * ### What `verify()` does:
   * Tests authentication credentials, network reachability, and configuration settings
   * with the provider **without** actually sending an email to a real recipient.
   *
   * ### Common Use Cases:
   * 1. **Admin Settings Connection Test:** Allowing admins in the dashboard to click "Test Connection"
   *    to verify SMTP or API key settings before saving.
   * 2. **Application Startup Health Check:** Validating mail server availability when the server boots.
   * 3. **Diagnostics & Pre-flight Checks:** Checking credentials before queuing bulk transactional jobs.
   *
   * @returns A promise resolving to `{ success: true }` if credentials and connectivity are valid,
   *          or `{ success: false, error: string }` detailing the failure.
   */
  verify?(): Promise<{ success: boolean; error?: string }>;
}

/**
 * Configuration options for the SMTP email transport plugin.
 */
export interface SMTPConfig {
  /**
   * SMTP server hostname (e.g. "smtp.gmail.com", "smtp.zoho.com", "mail.myhost.com", "email-smtp.us-east-1.amazonaws.com").
   */
  host: string;

  /**
   * SMTP port number.
   * Common defaults: `465` (SSL/TLS implicit) or `587` (STARTTLS / submission).
   * @default 587 (or 465 if secure is true)
   */
  port?: number;

  /**
   * Whether to establish an immediate SSL/TLS connection.
   * Should be `true` when connecting to port `465`, and `false` for port `587` or `25`.
   * @default false
   */
  secure?: boolean;

  /**
   * SMTP authentication credentials.
   */
  auth: {
    /**
     * SMTP username or login address (e.g. "prassamin@gmail.com").
     */
    user: string;

    /**
     * SMTP password or dedicated App Password.
     */
    pass: string;
  };

  /**
   * Default sender address (e.g. "PRAS Samin <prassamin@gmail.com>").
   */
  from?: string;

  /**
   * Transport Layer Security (TLS) socket options.
   */
  tls?: {
    /**
     * Whether to reject self-signed or unauthorized certificates.
     * Set to `false` if connecting to local development mailboxes (e.g. MailHog, Mailpit) with self-signed certificates.
     * @default false
     */
    rejectUnauthorized?: boolean;
  };

  /**
   * Optional well-known service profile name recognized by Nodemailer (e.g. "gmail", "zoho", "hotmail", "sendgrid").
   * When specified, Nodemailer automatically configures optimal `host`, `port`, and `secure` presets.
   */
  service?: string;
}

/**
 * Configuration options for the Resend REST API email plugin.
 */
export interface ResendConfig {
  /**
   * Resend API Key generated from https://resend.com/api-keys (starts with `re_...`).
   */
  apiKey: string;

  /**
   * Default verified sender email address configured on your Resend domain.
   * @example "Acme Store <orders@acmestore.com>"
   */
  from?: string;
}

/**
 * Configuration options for the Console (Development) email plugin.
 */
export interface ConsoleConfig {
  /**
   * Default sender address displayed in the console output.
   * @default "no-reply@nishchinte.com"
   */
  from?: string;

  /**
   * Whether logging is enabled.
   * @default true
   */
  enabled?: boolean;
}
