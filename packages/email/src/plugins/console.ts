import type {
  EmailPlugin,
  EmailMessage,
  EmailSendResult,
  ConsoleConfig,
} from "../types";

/**
 * Creates a Console/Development email plugin.
 *
 * Formats and pretty-prints outgoing emails directly to the server terminal (`stdout`)
 * instead of making outbound network requests.
 *
 * ### Ideal for:
 * - **Local Development:** Instant feedback without registering SMTP credentials or third-party API accounts.
 * - **Automated Testing & CI:** Safe test execution with zero risk of sending unwanted emails to real users.
 * - **Fallback / Offline Mode:** Default driver when no production credentials are provided in `.env`.
 *
 * @param config - Optional {@link ConsoleConfig} options.
 * @returns An {@link EmailPlugin} instance for local development.
 *
 * @example
 * ```typescript
 * import { consoleEmail } from "@nishchinte/email";
 *
 * const devMailer = consoleEmail({
 *   from: "Local Store <dev@nishchinte.com>",
 * });
 * ```
 */
export function consoleEmail(config?: ConsoleConfig): EmailPlugin {
  return {
    name: "console",
    defaultFrom: config?.from || "no-reply@nishchinte.com",

    /**
     * Pretty-prints the outgoing email message to standard output (`console.log`).
     *
     * Displays a clean formatted card with headers (From, To, Subject, Timestamp) and
     * plaintext body (or cleaned HTML content preview).
     *
     * @param message - The normalized email message payload.
     * @returns A promise resolving to an {@link EmailSendResult} with a simulated `messageId`.
     */
    async send(message: EmailMessage): Promise<EmailSendResult> {
      const from = message.from || config?.from || "no-reply@nishchinte.com";
      const to = Array.isArray(message.to) ? message.to.join(", ") : message.to;
      const messageId = `console-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      console.log("\n" + "=".repeat(60));
      console.log("📨 [NISHCHINTE EMAIL DRIVER: CONSOLE]");
      console.log("=".repeat(60));
      console.log(`From:    ${from}`);
      console.log(`To:      ${to}`);
      console.log(`Subject: ${message.subject}`);
      console.log(`Time:    ${new Date().toISOString()}`);
      console.log("-".repeat(60));
      if (message.text) {
        console.log("TEXT CONTENT:");
        console.log(message.text.trim());
      } else {
        // Strip basic HTML tags for console readability
        const plainPreview = message.html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        console.log("CONTENT PREVIEW:");
        console.log(plainPreview);
      }
      console.log("=".repeat(60) + "\n");

      return {
        success: true,
        messageId,
        provider: "console",
      };
    },

    /**
     * Verifies the console email driver.
     *
     * Since terminal output is always available in any running JavaScript environment,
     * this always returns `{ success: true }`.
     *
     * @returns A promise resolving to `{ success: true }`.
     */
    async verify(): Promise<{ success: boolean }> {
      return { success: true };
    },
  };
}
