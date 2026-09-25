import type { EmailPlugin, EmailMessage, EmailSendResult, ResendConfig } from "../types";

/**
 * Creates an email plugin for the Resend REST API using native `fetch`.
 *
 * Direct REST integration with zero runtime dependencies. Works in standard Node.js,
 * Bun, Deno, Cloudflare Workers, and serverless Edge runtimes.
 *
 * @param config - The {@link ResendConfig} object containing the API key and default sender address.
 * @returns An {@link EmailPlugin} configured for Resend.
 *
 * @example
 * ```typescript
 * import { resendEmail } from "@nishchinte/email";
 *
 * const resend = resendEmail({
 *   apiKey: process.env.RESEND_API_KEY!,
 *   from: "Acme Store <hello@acme.com>",
 * });
 * ```
 */
export function resendEmail(config: ResendConfig): EmailPlugin {
  return {
    name: "resend",
    defaultFrom: config.from,

    /**
     * Sends an email via Resend's `https://api.resend.com/emails` REST API.
     *
     * Automatically converts buffers/strings into base64 attachments as required by the Resend REST API.
     *
     * @param message - The normalized email message payload.
     * @returns A promise resolving to an {@link EmailSendResult}.
     */
    async send(message: EmailMessage): Promise<EmailSendResult> {
      try {
        const from = message.from || config.from;

        if (!from) {
          return {
            success: false,
            error: "No 'from' address configured for Resend email plugin",
            provider: "resend",
          };
        }

        const to = Array.isArray(message.to) ? message.to : [message.to];

        const payload: Record<string, unknown> = {
          from,
          to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
          cc: message.cc,
          bcc: message.bcc,
        };

        if (message.attachments?.length) {
          payload.attachments = message.attachments.map((att) => ({
            filename: att.filename,
            content: typeof att.content === "string" 
              ? att.content 
              : att.content ? Buffer.from(att.content).toString("base64") : undefined,
            path: att.path,
          }));
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          return {
            success: false,
            error: data?.message || `Resend API error (${res.status})`,
            provider: "resend",
          };
        }

        return {
          success: true,
          messageId: data?.id,
          provider: "resend",
        };
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || "Failed to send email via Resend API",
          provider: "resend",
        };
      }
    },

    /**
     * Verifies the Resend API Key validity without sending an email.
     *
     * ### How it works:
     * Executes an authenticated GET probe against Resend's API (`https://api.resend.com/api-keys`).
     * - If the API key is active and valid, the API responds with HTTP 200 OK.
     * - If the API key is revoked, expired, or invalid, the API responds with HTTP 401/403.
     *
     * ### When to use:
     * - In Admin Settings when an admin pastes their Resend API key and tests it.
     * - In health check endpoints.
     *
     * @returns A promise resolving to `{ success: true }` if the key is authorized,
     *          or `{ success: false, error: string }` if verification failed.
     */
    async verify(): Promise<{ success: boolean; error?: string }> {
      try {
        const res = await fetch("https://api.resend.com/api-keys", {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        });
        if (!res.ok) {
          return { success: false, error: "Invalid Resend API Key" };
        }
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || "Failed to verify Resend API key",
        };
      }
    },
  };
}

