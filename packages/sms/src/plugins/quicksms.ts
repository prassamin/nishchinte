/**
 * @fileoverview Quick SMS (quicksmsapp.com) Plugin for Nishchinte SMS Engine.
 * Provides integration with Quick SMS API for transactional SMS dispatch and balance checks.
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
 * Configuration options for Quick SMS (quicksmsapp.com) plugin.
 */
export interface QuickSmsConfig {
  /**
   * API Key provided by Quick SMS (`quick_api`).
   */
  apiKey: string;

  /**
   * Optional User Key provided by Quick SMS (`user_key`).
   */
  userKey?: string;

  /**
   * Optional sender ID or label for reference.
   */
  senderId?: string;

  /**
   * Optional custom API base URL.
   * @default "https://quicksmsapp.com"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload for Quick SMS.
 */
export interface QuickSmsMessage extends BaseSmsMessage {
  /**
   * Optional user key overriding configuration.
   */
  userKey?: string;
}

/**
 * Result object returned when sending an SMS via Quick SMS.
 */
export interface QuickSmsSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "quicksms";
}

/**
 * Balance check result for Quick SMS.
 */
export interface QuickSmsBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "quicksms";

  /**
   * Remaining SMS balance count.
   */
  smsBalance?: string | number;
}

/**
 * Pluggable Quick SMS driver interface.
 */
export interface QuickSmsPlugin extends SmsPlugin<
  QuickSmsMessage,
  QuickSmsSendResult
> {
  /**
   * Unique plugin identifier.
   */
  name: "quicksms";

  /**
   * Default sender ID or label.
   */
  defaultSenderId?: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: false;

  /**
   * Sends an SMS message via Quick SMS.
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link QuickSmsSendResult}.
   */
  send(message: QuickSmsMessage): Promise<QuickSmsSendResult>;

  /**
   * Retrieves remaining balance from Quick SMS.
   *
   * @returns A promise resolving to {@link QuickSmsBalanceResult}.
   */
  getBalance(): Promise<QuickSmsBalanceResult>;

  /**
   * Verifies API credentials and connectivity to Quick SMS API.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

function mapQuickSmsCodeToHttp(
  status?: number | string,
  resStatus?: number,
): number {
  if (status === 0 || status === "0" || status === 4 || status === "4")
    return 200;
  if (status === 1 || status === "1") return 401; // Invalid API key or number
  if (status === 2 || status === "2") return 403; // Validity expired
  if (status === 3 || status === "3") return 402; // Insufficient balance
  if (resStatus && resStatus >= 200 && resStatus < 600) return resStatus;
  return 500;
}

const QUICK_SMS_ERROR_CODES: Record<number | string, string> = {
  0: "SMS delivered successfully",
  1: "Invalid API Key or mobile number",
  2: "Package validity expired",
  3: "Insufficient SMS balance",
  4: "SMS request pending / queued",
};

/**
 * Creates a Quick SMS (quicksmsapp.com) SMS plugin.
 *
 * @param config - {@link QuickSmsConfig} credentials and settings.
 * @returns A {@link QuickSmsPlugin} instance for Quick SMS.
 *
 * @example
 * ```typescript
 * import { quickSms } from "@nishchinte/sms";
 *
 * const sms = quickSms({
 *   apiKey: "your_quick_api_key",
 *   userKey: "your_user_key", // required for balance inquiries
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // false
 * ```
 *
 * @summary worst provider ever
 */
export function quickSms(config: QuickSmsConfig): QuickSmsPlugin {
  if (!config?.apiKey) {
    throw new Error("quickSms plugin requires a valid `apiKey`.");
  }

  const baseUrl = (config.baseUrl || "https://quicksmsapp.com").replace(
    /\/+$/,
    "",
  );

  return {
    name: "quicksms",
    defaultSenderId: config.senderId,
    bulkSupport: false,

    async send(message: QuickSmsMessage): Promise<QuickSmsSendResult> {
      try {
        const rawTarget =
          typeof message.recipient === "string"
            ? message.recipient
            : Array.isArray(message.recipient)
              ? message.recipient[0]
              : "";
        const recipient = formatBdMobile(rawTarget);
        if (!recipient) {
          return {
            success: false,
            provider: "quicksms",
            statusCode: 400,
            error: "No valid recipient phone number provided.",
          };
        }

        const params = new URLSearchParams({
          quick_api: config.apiKey,
          mobile: recipient,
          msg: message.message,
          user_key: message.userKey || config.userKey || "",
        });

        const res = await fetch(
          `${baseUrl}/Api/sms/campaign_api?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json, text/plain, */*",
            },
          },
        );

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
            provider: "quicksms",
            recipient,
            recipientCount: 1,
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
            raw: data,
          };
        }

        const status = data?.status;
        const smsStatus = String(data?.sms || "").toUpperCase();

        const isSuccess =
          status === 0 ||
          status === "0" ||
          status === 4 ||
          status === "4" ||
          smsStatus === "DELIVERD" ||
          smsStatus === "DELIVERED" ||
          smsStatus === "PENDING" ||
          data?.status === "success";

        if (isSuccess) {
          const messageId = String(
            data?.msg_id ||
              data?.msgId ||
              data?.message_id ||
              `qsms_${Date.now()}`,
          );

          return {
            success: true,
            provider: "quicksms",
            messageId,
            recipient,
            recipientCount: 1,
            smsCount: 1,
            statusCode: 200,
            raw: data,
          };
        }

        const codeDescription =
          status !== undefined ? QUICK_SMS_ERROR_CODES[status] : null;
        const errorMessage =
          data?.message ||
          data?.error ||
          codeDescription ||
          (smsStatus ? `Quick SMS: ${smsStatus}` : null) ||
          (status !== undefined
            ? `Quick SMS error status ${status}`
            : "Failed to send SMS via Quick SMS");

        return {
          success: false,
          provider: "quicksms",
          recipient,
          recipientCount: 1,
          statusCode: mapQuickSmsCodeToHttp(status, res.status),
          error: errorMessage,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "quicksms",
          statusCode: 500,
          error: err.message || "Network error while calling Quick SMS API",
        };
      }
    },

    async verify(): Promise<SmsVerifyResult> {
      try {
        if (!config.userKey) {
          return { success: true, provider: "quicksms", statusCode: 200 };
        }

        const params = new URLSearchParams({
          quick_api: config.apiKey,
          user_key: config.userKey,
        });

        const res = await fetch(
          `${baseUrl}/Api/sms_api/sms_balance?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          },
        );

        const data: any = await res.json().catch(() => null);

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "quicksms",
            statusCode: res.status || 500,
            error: `Quick SMS verification failed (HTTP ${res.status})`,
            raw: data,
          };
        }

        if (data?.status === "success" || data?.sms_balance !== undefined) {
          return { success: true, provider: "quicksms", statusCode: 200, raw: data };
        }

        if (data?.status === "error") {
          return {
            success: false,
            provider: "quicksms",
            statusCode: 401,
            error: data.message || "Quick SMS verification failed",
            raw: data,
          };
        }

        return { success: true, provider: "quicksms", statusCode: 200, raw: data };
      } catch (err: any) {
        return {
          success: false,
          provider: "quicksms",
          statusCode: 500,
          error:
            err.message ||
            "Connection error while verifying Quick SMS credentials",
        };
      }
    },

    async getBalance(): Promise<QuickSmsBalanceResult> {
      try {
        if (!config.userKey) {
          return {
            success: false,
            provider: "quicksms",
            statusCode: 400,
            error:
              "Quick SMS requires `userKey` to check balance. Please provide `userKey` in quickSms({ apiKey, userKey }).",
          };
        }

        const params = new URLSearchParams({
          quick_api: config.apiKey,
          user_key: config.userKey,
        });

        const res = await fetch(
          `${baseUrl}/Api/sms_api/sms_balance?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          },
        );

        const data: any = await res.json().catch(() => null);

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "quicksms",
            statusCode: res.status || 500,
            error: `Failed to fetch Quick SMS balance (HTTP ${res.status})`,
            raw: data,
          };
        }

        if (data?.status === "success" || data?.sms_balance !== undefined) {
          return {
            success: true,
            provider: "quicksms",
            balance: data?.sms_balance,
            smsBalance: data?.sms_balance,
            statusCode: 200,
            raw: data,
          };
        }

        if (data?.status === "error") {
          return {
            success: false,
            provider: "quicksms",
            statusCode: 401,
            error: data.message || "Failed to fetch Quick SMS balance",
            raw: data,
          };
        }

        return {
          success: false,
          provider: "quicksms",
          statusCode: 400,
          error: "Failed to parse Quick SMS balance response",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "quicksms",
          statusCode: 500,
          error: err.message || "Failed to fetch Quick SMS balance",
        };
      }
    },
  };
}
