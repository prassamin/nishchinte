// Plugins
export { smtpEmail } from "./plugins/smtp";
export { resendEmail } from "./plugins/resend";
export { consoleEmail } from "./plugins/console";

// Client & Config Helpers
export { createEmailClient } from "./client";
export type { EmailClient } from "./client";

// Types
export type {
  EmailMessage,
  EmailAttachment,
  EmailSendResult,
  EmailPlugin,
  SMTPConfig,
  ResendConfig,
  ConsoleConfig,
} from "./types";

