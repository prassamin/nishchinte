import type { EmailPlugin, EmailMessage, EmailSendResult } from "./types";

/**
 * Unified, provider-agnostic email client interface.
 *
 * Exposes methods to send messages and test provider connectivity.
 */
export interface EmailClient {
  /**
   * The underlying configured {@link EmailPlugin} driver handling transports.
   */
  readonly plugin: EmailPlugin;

  /**
   * Dispatches an email message using the active provider plugin.
   *
   * @param message - The email message to send, including recipients, subject, and body content.
   * @returns A promise resolving to an {@link EmailSendResult} indicating success/failure and message details.
   *
   * @example
   * ```typescript
   * const result = await mailer.send({
   *   to: "customer@example.com",
   *   subject: "Your Order is Confirmed",
   *   html: "<h1>Thank you for your order!</h1>",
   *   text: "Thank you for your order!",
   * });
   *
   * if (!result.success) {
   *   console.error("Failed to deliver email:", result.error);
   * }
   * ```
   */
  send(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Performs a non-destructive diagnostic check to verify credentials and connectivity with the provider.
   *
   * ### What `verify()` does:
   * - **For SMTP:** Opens a socket connection to the mail server, negotiates TLS/STARTTLS, and
   *   validates SMTP AUTH user credentials via `transporter.verify()`.
   * - **For Resend / REST APIs:** Performs an authenticated metadata query to confirm the API Key is valid.
   * - **For Console / Dev:** Instantly confirms the logger is ready (`{ success: true }`).
   *
   * ### When to call `verify()`:
   * 1. In **Admin Settings** when an administrator inputs new SMTP or API settings and clicks a "Test Connection" button.
   * 2. During **Application Boot / Health Check** routes (`/api/health`) to warn operators if the outbound mail service is unreachable.
   * 3. In **CI / Staging environments** to catch expired API keys or misconfigured ports before deployment.
   *
   * @returns A promise resolving to `{ success: true }` if the connection and credentials are valid,
   *          or `{ success: false, error: string }` if verification failed.
   *
   * @example
   * ```typescript
   * const status = await mailer.verify();
   * if (status.success) {
   *   console.log("Email server connection verified successfully!");
   * } else {
   *   console.error("Email configuration error:", status.error);
   * }
   * ```
   */
  verify(): Promise<{ success: boolean; error?: string }>;
}

/**
 * Creates an instance of {@link EmailClient} configured with the specified provider plugin.
 *
 * @param plugin - The initialized {@link EmailPlugin} (e.g. `smtpEmail(...)`, `resendEmail(...)`, or `consoleEmail()`).
 * @returns An {@link EmailClient} instance ready to dispatch emails and run connection checks.
 *
 * @example
 * ```typescript
 * import { createEmailClient, smtpEmail } from "@nishchinte/email";
 *
 * const mailer = createEmailClient(
 *   smtpEmail({
 *     host: "smtp.example.com",
 *     port: 587,
 *     auth: { user: "user", pass: "pass" },
 *     from: "Store <store@example.com>",
 *   })
 * );
 * ```
 */
export function createEmailClient(plugin: EmailPlugin): EmailClient {
  return {
    plugin,

    async send(message: EmailMessage): Promise<EmailSendResult> {
      return plugin.send(message);
    },

    async verify(): Promise<{ success: boolean; error?: string }> {
      if (plugin.verify) {
        return plugin.verify();
      }
      return { success: true };
    },
  };
}
