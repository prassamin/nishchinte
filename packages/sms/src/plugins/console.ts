/**
 * @fileoverview Console / Local Development SMS Plugin for Nishchinte SMS Engine.
 * Formats and pretty-prints outgoing SMS messages directly to standard output (`console.log`)
 * without making external network calls. Ideal for local development and CI testing.
 */

import type {
  SmsPlugin,
  BaseSmsMessage,
  SmsSendResult,
  SmsBalanceResult,
  SmsVerifyResult,
} from "../types";
import { formatBdMobile } from "../utils";

/**
 * Configuration options for the Console / Development SMS plugin.
 */
export interface ConsoleSmsConfig {
  /**
   * Default sender ID shown in console log headers.
   * @default "NISHCHINTE"
   */
  senderId?: string;

  /**
   * Custom label or prefix for console banner.
   */
  prefix?: string;
}

/**
 * Outbound SMS message payload for Console SMS plugin.
 */
export interface ConsoleSmsMessage extends BaseSmsMessage {
  /**
   * Recipient phone number (single string, array of strings, or comma-separated string).
   */
  recipient: string | string[];

  /**
   * Optional message type or tag (e.g. "otp", "transactional", "marketing").
   */
  type?: string;
}

/**
 * Result object returned when logging SMS via Console SMS plugin.
 */
export interface ConsoleSmsSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "console";
}

/**
 * Balance check result for Console SMS plugin.
 */
export interface ConsoleSmsBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "console";
}

/**
 * Pluggable Console SMS driver interface.
 */
export interface ConsoleSmsPlugin extends SmsPlugin<ConsoleSmsMessage, ConsoleSmsSendResult> {
  /**
   * Unique plugin identifier.
   */
  name: "console";

  /**
   * Default sender ID shown in console logs.
   */
  defaultSenderId: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: true;

  /**
   * Formats and logs the SMS message to standard output.
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link ConsoleSmsSendResult}.
   */
  send(message: ConsoleSmsMessage): Promise<ConsoleSmsSendResult>;

  /**
   * Returns sandbox balance indicator.
   *
   * @returns A promise resolving to {@link ConsoleSmsBalanceResult}.
   */
  getBalance(): Promise<ConsoleSmsBalanceResult>;

  /**
   * Verifies local driver readiness.
   *
   * @returns A promise resolving to `{ success: true }`.
   */
  verify(): Promise<SmsVerifyResult>;
}

/**
 * Creates a Console / Local Development SMS plugin.
 *
 * Formats and pretty-prints outgoing SMS messages directly to standard output (`console.log`)
 * without making external network calls. Ideal for local dev and CI.
 *
 * @param config - Optional {@link ConsoleSmsConfig} options.
 * @returns A {@link ConsoleSmsPlugin} instance for local development.
 *
 * @example
 * ```typescript
 * import { consoleSms } from "@nishchinte/sms";
 *
 * const devSms = consoleSms();
 * console.log("Bulk support:", devSms.bulkSupport); // true
 * ```
 */
export function consoleSms(config?: ConsoleSmsConfig): ConsoleSmsPlugin {
  return {
    name: "console",
    defaultSenderId: config?.senderId || "NISHCHINTE",
    bulkSupport: true,

    async send(message: ConsoleSmsMessage): Promise<ConsoleSmsSendResult> {
      let recipient = "";
      if (Array.isArray(message.recipient)) {
        recipient = message.recipient.map((num) => formatBdMobile(num)).filter(Boolean).join(", ");
      } else if (typeof message.recipient === "string" && message.recipient.includes(",")) {
        recipient = message.recipient
          .split(",")
          .map((num) => formatBdMobile(num.trim()))
          .filter(Boolean)
          .join(", ");
      } else {
        recipient = formatBdMobile(message.recipient) || "";
      }

      if (!recipient) {
        return {
          success: false,
          provider: "console",
          statusCode: 400,
          error: "No valid recipient phone number provided.",
        };
      }

      const recipientList = recipient.split(",").map((s) => s.trim()).filter(Boolean);
      const recipientParam = recipientList.length === 1 ? recipientList[0] : recipientList;
      const recipientCount = recipientList.length;

      const sender = message.senderId || config?.senderId || "NISHCHINTE";
      const messageId = `console-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      console.log("\n" + "=".repeat(60));
      console.log(
        `📱 [NISHCHINTE SMS: CONSOLE]${config?.prefix ? ` (${config.prefix})` : ""}`,
      );
      console.log("=".repeat(60));
      console.log(`Sender ID:    ${sender}`);
      console.log(`To:           ${recipient}`);
      console.log(`Type:         ${message.type || "otp"}`);
      console.log(`Time:         ${new Date().toISOString()}`);
      console.log("-".repeat(60));
      console.log("MESSAGE:");
      console.log(message.message.trim());
      console.log("=".repeat(60) + "\n");

      return {
        success: true,
        messageId,
        provider: "console",
        recipient: recipientParam,
        recipientCount,
        smsCount: 1,
        statusCode: 200,
        raw: { recipient: recipientParam, message: message.message, sender },
      };
    },

    async verify(): Promise<SmsVerifyResult> {
      return { success: true, provider: "console", statusCode: 200 };
    },

    async getBalance(): Promise<ConsoleSmsBalanceResult> {
      return { success: true, provider: "console", balance: "Unlimited (Console Sandbox)", statusCode: 200 };
    },
  };
}
