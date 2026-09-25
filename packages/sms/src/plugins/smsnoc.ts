/**
 * @fileoverview SmsNoc (smsnoc.com) Plugin for Nishchinte SMS Engine.
 * Provides integration with SmsNoc API for standard and bulk SMS dispatch and balance checks.
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
 * Configuration options for the SmsNoc (smsnoc.com) plugin.
 */
export interface SmsNocConfig {
  /**
   * API Key / Bearer token provided by smsnoc.com.
   *
   * @example "SN_312d424..."
   */
  apiKey: string;

  /**
   * Optional approved Sender ID / Masking name or Non-masking number.
   */
  senderId?: string;

  /**
   * Optional custom API base URL.
   * @default "https://smsnoc.com/api/v1"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload for SmsNoc.
 */
export interface SmsNocMessage extends BaseSmsMessage {
  /**
   * Recipient phone number (single string, array of strings, or comma-separated string).
   */
  recipient: string | string[];
}

/**
 * Dispatched message item detail in SmsNoc response.
 */
export interface SmsNocMessageDetail {
  /**
   * Unique message identifier assigned by SmsNoc.
   */
  id: string;

  /**
   * Target recipient phone number.
   */
  to: string;

  /**
   * Delivery status string (e.g. "delivered", "sent", "queued").
   */
  status: string;

  /**
   * Number of SMS parts/segments used for this recipient.
   */
  parts?: number;
}

/**
 * Result object returned when sending SMS via SmsNoc.
 */
export interface SmsNocSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "smsnoc";
}

/**
 * Channel rate card pricing from SmsNoc.
 */
export interface SmsNocRates {
  sms_masking?: number;
  sms_non_masking?: number;
  voice?: number;
  whatsapp?: number;
  email?: number;
  [key: string]: number | undefined;
}

/**
 * Balance check result for SmsNoc.
 */
export interface SmsNocBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "smsnoc";

  /**
   * Current wallet balance.
   */
  balance?: string | number;

  /**
   * Currency code (e.g. "BDT").
   */
  currency?: string;
}

/**
 * Pluggable SmsNoc driver interface.
 */
export interface SmsNocPlugin
  extends SmsPlugin<SmsNocMessage, SmsNocSendResult> {
  /**
   * Unique plugin identifier.
   */
  name: "smsnoc";

  /**
   * Default sender ID or masking name.
   */
  defaultSenderId?: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: true;

  /**
   * Sends an SMS message via SmsNoc (`POST /send-sms`).
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link SmsNocSendResult}.
   */
  send(message: SmsNocMessage): Promise<SmsNocSendResult>;

  /**
   * Checks wallet balance and channel rate card from SmsNoc (`GET /balance`).
   *
   * @returns A promise resolving to {@link SmsNocBalanceResult}.
   */
  getBalance(): Promise<SmsNocBalanceResult>;

  /**
   * Verifies API credentials and connectivity to SmsNoc API (`GET /balance`).
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

function mapSmsNocCodeToHttp(
  status?: string,
  errorMsg?: string,
  resStatus?: number,
): number {
  if (String(status).toLowerCase() === "success") return 200;
  const msg = String(errorMsg || "").toLowerCase();
  if (
    msg.includes("unauthorized") ||
    msg.includes("unauthenticated") ||
    msg.includes("api key") ||
    msg.includes("api_token") ||
    msg.includes("token")
  ) {
    return 401;
  }
  if (msg.includes("balance") || msg.includes("credit") || msg.includes("quota")) {
    return 402;
  }
  if (
    msg.includes("forbidden") ||
    msg.includes("permission") ||
    msg.includes("blocked") ||
    msg.includes("disabled")
  ) {
    return 403;
  }
  if (msg.includes("not found")) return 404;
  if (msg.includes("validation") || msg.includes("spam")) return 422;
  if (msg.includes("rate limit") || msg.includes("too many")) return 429;
  if (resStatus && resStatus >= 200 && resStatus < 600) return resStatus;
  return 400;
}

/**
 * Creates an SmsNoc (smsnoc.com) SMS plugin.
 *
 * @param config - {@link SmsNocConfig} credentials and settings.
 * @returns An {@link SmsNocPlugin} instance for SmsNoc.
 *
 * @example
 * ```typescript
 * import { smsNocSms } from "@nishchinte/sms";
 *
 * const sms = smsNocSms({
 *   apiKey: "SN_312d424...",
 *   senderId: "MyBrand",
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // true
 * ```
 */
export function smsNocSms(config: SmsNocConfig): SmsNocPlugin {
  if (!config?.apiKey) {
    throw new Error("smsNocSms plugin requires a valid `apiKey`.");
  }

  const baseUrl = (config.baseUrl || "https://smsnoc.com/api/v1").replace(
    /\/+$/,
    "",
  );

  return {
    name: "smsnoc",
    defaultSenderId: config.senderId,
    bulkSupport: true,

    async send(message: SmsNocMessage): Promise<SmsNocSendResult> {
      try {
        let recipientList: string[] = [];
        if (Array.isArray(message.recipient)) {
          recipientList = message.recipient
            .map((num) => formatBdMobile(num))
            .filter(Boolean);
        } else if (
          typeof message.recipient === "string" &&
          message.recipient.includes(",")
        ) {
          recipientList = message.recipient
            .split(",")
            .map((num) => formatBdMobile(num.trim()))
            .filter(Boolean);
        } else if (typeof message.recipient === "string") {
          const formatted = formatBdMobile(message.recipient);
          if (formatted) recipientList.push(formatted);
        }

        if (recipientList.length === 0) {
          return {
            success: false,
            provider: "smsnoc",
            statusCode: 400,
            error: "No valid recipient phone number provided.",
          };
        }

        const recipientParam =
          recipientList.length === 1 ? recipientList[0] : recipientList;
        const recipientCount = recipientList.length;

        const senderId = message.senderId || config.senderId;
        const payload: Record<string, any> = {
          to: recipientParam,
          message: message.message,
        };

        if (senderId) {
          payload.sender_id = senderId;
        }

        const res = await fetch(`${baseUrl}/send-sms`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json, text/plain, */*",
          },
          body: JSON.stringify(payload),
        });

        const rawText = await res.text();
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { rawResponse: rawText };
        }

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "smsnoc",
            recipient: recipientParam,
            recipientCount,
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
            raw: data,
          };
        }

        const isSuccess =
          data?.status === "success" ||
          data?.success === true ||
          (data?.status === undefined && res.ok && data?.message_count != null);

        if (isSuccess) {
          const messageId = String(
            data?.messages?.[0]?.id ||
              data?.id ||
              data?.message_id ||
              `smsnoc_${Date.now()}`,
          );

          const smsCount =
            data?.parts_per_message ||
            data?.message_count ||
            (data?.messages?.reduce(
              (acc: number, curr: any) => acc + (curr.parts || 1),
              0,
            ) as number) ||
            1;

          return {
            success: true,
            provider: "smsnoc",
            messageId,
            recipient: recipientParam,
            recipientCount,
            smsCount,
            statusCode: 200,
            raw: data,
          };
        }

        const errorMessage =
          data?.message ||
          data?.error ||
          data?.error_message ||
          (typeof data?.errors === "object"
            ? Object.values(data.errors).flat().join(", ")
            : null) ||
          "Failed to send SMS via SmsNoc";

        return {
          success: false,
          provider: "smsnoc",
          recipient: recipientParam,
          recipientCount,
          statusCode: mapSmsNocCodeToHttp(data?.status, errorMessage, res.status),
          error: errorMessage,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "smsnoc",
          statusCode: 500,
          error: err.message || "Network error while calling SmsNoc API",
        };
      }
    },

    async verify(): Promise<SmsVerifyResult> {
      try {
        const res = await fetch(`${baseUrl}/balance`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            Accept: "application/json, text/plain, */*",
          },
        });

        const rawText = await res.text();
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { rawResponse: rawText };
        }

        if (!res.ok) {
          const errorMessage =
            data?.message ||
            data?.error ||
            `Failed to verify credentials: HTTP ${res.status}`;
          return {
            success: false,
            provider: "smsnoc",
            statusCode: mapSmsNocCodeToHttp(data?.status, errorMessage, res.status),
            error: errorMessage,
            raw: data,
          };
        }

        if (data?.success === false || data?.status === "error") {
          return {
            success: false,
            provider: "smsnoc",
            statusCode: 401,
            error: data?.message || "Invalid SmsNoc credentials",
            raw: data,
          };
        }

        return {
          success: true,
          provider: "smsnoc",
          statusCode: 200,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "smsnoc",
          statusCode: 500,
          error: err.message || "Connection error while verifying SmsNoc credentials",
        };
      }
    },

    async getBalance(): Promise<SmsNocBalanceResult> {
      try {
        const res = await fetch(`${baseUrl}/balance`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            Accept: "application/json, text/plain, */*",
          },
        });

        const rawText = await res.text();
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { rawResponse: rawText };
        }

        if (!res.ok) {
          const errorMessage =
            data?.message ||
            data?.error ||
            `Failed to fetch SmsNoc balance: HTTP ${res.status}`;
          return {
            success: false,
            provider: "smsnoc",
            statusCode: mapSmsNocCodeToHttp(data?.status, errorMessage, res.status),
            error: errorMessage,
            raw: data,
          };
        }

        const balance = data?.balance ?? 0;

        return {
          success: true,
          provider: "smsnoc",
          balance: String(balance),
          currency: data?.currency || "BDT",
          statusCode: 200,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "smsnoc",
          statusCode: 500,
          error: err.message || "Failed to fetch SmsNoc balance",
        };
      }
    },
  };
}
