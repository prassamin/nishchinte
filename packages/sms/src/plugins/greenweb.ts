/**
 * @fileoverview GreenWeb BD (greenweb.com.bd) Plugin for Nishchinte SMS Engine.
 * Provides integration with GreenWeb BD API for standard and bulk SMS dispatch and balance checks.
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
 * Configuration options for the GreenWeb BD (greenweb.com.bd) plugin.
 */
export interface GreenwebConfig {
  /**
   * API Key provided by Greenweb BD.
   */
  token: string;

  /**
   * Optional approved Sender ID / Masking name.
   */
  senderId?: string;

  /**
   * Optional custom API base URL.
   * @default "https://api.greenweb.com.bd"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload for GreenWeb BD.
 */
export interface GreenwebMessage extends BaseSmsMessage {
  /**
   * Recipient phone number (single string, array of strings, or comma-separated string).
   */
  recipient: string | string[];
}

/**
 * Result object returned when sending SMS via GreenWeb BD.
 */
export interface GreenwebSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "greenweb";
}

/**
 * Balance check result for GreenWeb BD.
 */
export interface GreenwebBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "greenweb";
}

/**
 * Pluggable GreenWeb BD driver interface.
 */
export interface GreenwebPlugin extends SmsPlugin<
  GreenwebMessage,
  GreenwebSendResult
> {
  /**
   * Unique plugin identifier.
   */
  name: "greenweb";

  /**
   * Default sender ID or masking name.
   */
  defaultSenderId?: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: true;

  /**
   * Sends an SMS message via GreenWeb BD.
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link GreenwebSendResult}.
   */
  send(message: GreenwebMessage): Promise<GreenwebSendResult>;

  /**
   * Checks remaining account balance from GreenWeb BD.
   *
   * @returns A promise resolving to {@link GreenwebBalanceResult}.
   */
  getBalance(): Promise<GreenwebBalanceResult>;

  /**
   * Verifies API credentials and connectivity to GreenWeb BD API.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

function mapGreenwebStatusToHttp(
  status?: string,
  statusMsg?: string,
  resStatus?: number,
): number {
  const s = String(status || "").toUpperCase();
  const msg = String(statusMsg || "").toLowerCase();
  if (s === "SENT" || msg.includes("success")) return 200;
  if (msg.includes("token") || msg.includes("unauth") || s === "INVALID_TOKEN")
    return 401;
  if (msg.includes("balance") || s === "LOW_BALANCE") return 402;
  if (
    msg.includes("blocked") ||
    msg.includes("suspend") ||
    msg.includes("permission")
  )
    return 403;
  if (
    msg.includes("invalid") ||
    msg.includes("parameter") ||
    msg.includes("number") ||
    s === "BAD_REQUEST"
  )
    return 400;
  if (resStatus && resStatus >= 200 && resStatus < 600) return resStatus;
  return 500;
}

/**
 * Creates a GreenWeb BD (greenweb.com.bd) SMS plugin.
 *
 * @param config - {@link GreenwebConfig} credentials and settings.
 * @returns A {@link GreenwebPlugin} instance for GreenWeb BD.
 *
 * @example
 * ```typescript
 * import { greenwebSms } from "@nishchinte/sms";
 *
 * const sms = greenwebSms({
 *   token: "your_greenweb_token",
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // true
 * ```
 */
export function greenwebSms(config: GreenwebConfig): GreenwebPlugin {
  if (!config?.token) {
    throw new Error("greenwebSms plugin requires a valid `token`.");
  }

  const baseUrl = config.baseUrl || "https://api.greenweb.com.bd";

  return {
    name: "greenweb",
    defaultSenderId: config.senderId,
    bulkSupport: true,

    async send(message: GreenwebMessage): Promise<GreenwebSendResult> {
      try {
        let recipient = "";
        if (Array.isArray(message.recipient)) {
          recipient = message.recipient
            .map((num) => formatBdMobile(num))
            .filter(Boolean)
            .join(",");
        } else if (
          typeof message.recipient === "string" &&
          message.recipient.includes(",")
        ) {
          recipient = message.recipient
            .split(",")
            .map((num) => formatBdMobile(num.trim()))
            .filter(Boolean)
            .join(",");
        } else {
          recipient = formatBdMobile(message.recipient) || "";
        }

        if (!recipient) {
          return {
            success: false,
            provider: "greenweb",
            statusCode: 400,
            error: "No valid recipient phone number provided.",
          };
        }

        const recipientList = recipient.split(",");
        const recipientParam =
          recipientList.length === 1 ? recipientList[0] : recipientList;
        const recipientCount = recipientList.length;

        const params = new URLSearchParams({
          token: config.token,
          to: recipient,
          message: message.message,
        });

        const res = await fetch(`${baseUrl}/api.php?json`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });

        if (!res.ok) {
          return {
            success: false,
            provider: "greenweb",
            recipient: recipientParam,
            recipientCount,
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
          };
        }

        const data: any = await res.json();
        const first = Array.isArray(data) ? data[0] : data;

        if (
          first?.status === "SENT" ||
          first?.statusmsg?.toLowerCase().includes("successful")
        ) {
          return {
            success: true,
            provider: "greenweb",
            messageId: first?.msgid || `gw_${Date.now()}`,
            recipient: recipientParam,
            recipientCount,
            smsCount: 1,
            statusCode: 200,
            raw: data,
          };
        }

        return {
          success: false,
          provider: "greenweb",
          recipient: recipientParam,
          recipientCount,
          statusCode: mapGreenwebStatusToHttp(
            first?.status,
            first?.statusmsg,
            res.status,
          ),
          error:
            first?.statusmsg ||
            first?.status ||
            "Failed to send SMS via GreenWeb",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "greenweb",
          statusCode: 500,
          error: err.message || "Network error while calling GreenWeb SMS API",
        };
      }
    },

    async verify(): Promise<SmsVerifyResult> {
      try {
        const res = await fetch(
          `${baseUrl}/g_api.php?token=${encodeURIComponent(config.token)}&balance&json`,
        );

        const data: any = await res.json().catch(() => null);
        const response = Array.isArray(data) ? data[0] : data;

        if (!res.ok && !response) {
          return {
            success: false,
            provider: "greenweb",
            statusCode: res.status || 500,
            error: `Failed to verify token: HTTP ${res.status}`,
            raw: data,
          };
        }

        if (
          response?.status === "FAILED" ||
          response?.statusmsg?.toLowerCase().includes("error") ||
          response?.statusmsg?.toLowerCase().includes("invalid") ||
          response?.statusmsg?.toLowerCase().includes("unauth")
        ) {
          const statusCode = mapGreenwebStatusToHttp(response?.status, response?.statusmsg, res.status);
          return {
            success: false,
            provider: "greenweb",
            statusCode,
            error: response?.statusmsg || "Invalid GreenWeb API token",
            raw: response,
          };
        }

        return { success: true, provider: "greenweb", statusCode: 200, raw: response };
      } catch (err: any) {
        return {
          success: false,
          provider: "greenweb",
          statusCode: 500,
          error: err.message || "Connection error while verifying GreenWeb credentials",
        };
      }
    },

    async getBalance(): Promise<GreenwebBalanceResult> {
      try {
        const res = await fetch(
          `${baseUrl}/g_api.php?token=${encodeURIComponent(config.token)}&balance&json`,
        );

        const data: any = await res.json().catch(() => null);
        const response = Array.isArray(data) ? data[0] : data;

        if (!res.ok && !response) {
          return {
            success: false,
            provider: "greenweb",
            statusCode: res.status || 500,
            error: `Failed to fetch balance: HTTP ${res.status}`,
            raw: data,
          };
        }

        if (
          response?.status === "FAILED" ||
          response?.statusmsg?.toLowerCase().includes("error") ||
          response?.statusmsg?.toLowerCase().includes("invalid")
        ) {
          const statusCode = mapGreenwebStatusToHttp(response?.status, response?.statusmsg, res.status);
          return {
            success: false,
            provider: "greenweb",
            statusCode,
            error: response?.statusmsg || "Failed to fetch GreenWeb balance",
            raw: response,
          };
        }

        const balance = response?.response ?? response?.balance;

        if (balance !== undefined) {
          return {
            success: true,
            provider: "greenweb",
            balance: String(balance),
            statusCode: 200,
            raw: response,
          };
        }

        return {
          success: false,
          provider: "greenweb",
          statusCode: 400,
          error: response?.statusmsg || "Failed to parse GreenWeb balance",
          raw: response,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "greenweb",
          statusCode: 500,
          error: err.message || "Failed to fetch GreenWeb balance",
        };
      }
    },
  };
}
