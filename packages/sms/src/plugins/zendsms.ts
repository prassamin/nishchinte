/**
 * @fileoverview Zend SMS Plugin for Nishchinte SMS Engine.
 * Provides integration with Zend SMS API (https://zendsms.com / https://api.zendsms.com)
 * for standard outbound SMS dispatch and account balance inquiries.
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
 * Configuration options required to initialize the Zend SMS plugin.
 */
export interface ZendSmsConfig {
  /**
   * Secret API Key (`sk_live_...` or `sk_...`) provided in your Zend SMS developer portal.
   *
   * @example "sk_live_m3vq6wkvp7yr2c2ax9wwuvc37mznww92wqgalq5v"
   */
  apiKey: string;

  /**
   * Approved Sender ID or Masking name registered on your Zend SMS account.
   *
   * @example "8809612781018" or "MYBRAND"
   */
  senderId: string;

  /**
   * Optional custom API base URL for proxying or enterprise routing.
   *
   * @default "https://api.zendsms.com"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload tailored for Zend SMS.
 */
export interface ZendSmsMessage extends BaseSmsMessage {
  /**
   * Recipient phone number (e.g. "017XXXXXXXX", "+88017XXXXXXXX", or "88017XXXXXXXX").
   */
  recipient: string;

  /**
   * Idempotency key or external tracking reference (e.g. order ID, user ID).
   * Passed to Zend SMS as `client_ref`.
   *
   * @example "order_ord_1002"
   */
  clientRef?: string;
}

/**
 * Result object returned after an SMS dispatch attempt via Zend SMS.
 */
export interface ZendSmsSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "zendsms";
}

/**
 * Result returned when querying Zend SMS wallet balance (`GET /api/v1/balance`).
 */
export interface ZendSmsBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "zendsms";

  /**
   * Current remaining account balance (credits or amount in BDT).
   */
  balance?: number | string;

  /**
   * Currency code for the balance amount.
   *
   * @default "BDT"
   */
  currency?: string;

  /**
   * Structured data returned by the Zend SMS balance endpoint.
   */
  data?: {
    balance?: number | string;
    wallet_balance?: number | string;
    currency?: string;
    [key: string]: unknown;
  };
}

/**
 * Zend SMS transport driver interface providing standard SMS and specialized OTP/balance capabilities.
 */
export interface ZendSmsPlugin extends SmsPlugin<ZendSmsMessage, ZendSmsSendResult> {
  /**
   * Unique plugin identifier.
   */
  name: "zendsms";

  /**
   * Default sender ID or masking name configured for this driver.
   */
  defaultSenderId: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: false;

  /**
   * Sends an outbound SMS message via Zend SMS (`POST /api/v1/send-sms`).
   *
   * @param message - The SMS message payload including recipient and content.
   * @returns A promise resolving to {@link ZendSmsSendResult}.
   */
  send(message: ZendSmsMessage): Promise<ZendSmsSendResult>;

  /**
   * Retrieves the current account balance and currency from Zend SMS (`GET /api/v1/balance`).
   *
   * @returns A promise resolving to {@link ZendSmsBalanceResult}.
   */
  getBalance(): Promise<ZendSmsBalanceResult>;

  /**
   * Verifies API credentials and connectivity to Zend SMS API.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

function mapZendCodeToHttp(code?: number, resStatus?: number): number {
  if (code === 1000) return 200;
  if (code === 2001) return 401; // Invalid API key
  if (code === 2002 || code === 2003 || code === 2004) return 403; // Disabled / IP blocked / Suspended
  if (code && code >= 2101 && code <= 2107) return 400; // Invalid input parameters
  if (code === 2201) return 402; // Insufficient balance
  if (code === 2202 || code === 2203 || code === 2204) return 429; // Rate limit / quota exceeded
  if (code && code >= 2301 && code <= 2305) return 502; // Gateway routing
  if (code === 5000) return 500;
  if (code === 5001) return 503;
  if (code === 5002) return 504;
  if (resStatus && resStatus >= 200) return resStatus;
  return 500;
}

/**
 * Standard Zend SMS response code error messages for human-readable error diagnostics.
 */
const ZEND_SMS_ERROR_CODES: Record<number | string, string> = {
  1000: "Success",
  2001: "Invalid API key",
  2002: "API key disabled",
  2003: "IP not allowed",
  2004: "Account suspended",
  2101: "Invalid recipient",
  2102: "Invalid sender ID",
  2103: "Sender ID not approved",
  2104: "Message required",
  2105: "Invalid request",
  2106: "Message too long",
  2107: "Invalid client_ref",
  2201: "Insufficient balance",
  2202: "TPS limit exceeded",
  2203: "Daily limit exceeded",
  2204: "Account limit reached",
  2301: "Message not found",
  2302: "SMS rejected",
  2303: "Provider unavailable",
  2304: "Temporary routing failure",
  2305: "Invalid message ID",
  2401: "Invalid OTP",
  2402: "OTP expired",
  2403: "OTP max attempts",
  2404: "OTP resend too soon",
  2405: "OTP not found",
  2406: "OTP already verified",
  2407: "Invalid OTP format",
  2408: "Too many OTP requests",
  5000: "Internal server error",
  5001: "Service unavailable",
  5002: "Upstream timeout",
};

/**
 * Creates an instance of {@link ZendSmsPlugin} for sending SMS and managing OTPs via Zend SMS.
 *
 * @param config - {@link ZendSmsConfig} credentials including API key and Sender ID.
 * @returns A fully initialized {@link ZendSmsPlugin} instance.
 * @throws {Error} If `apiKey` or `senderId` is missing from configuration.
 *
 * @example
 * ```typescript
 * import { zendSms } from "@nishchinte/sms";
 *
 * const sms = zendSms({
 *   apiKey: "sk_live_m3vq6wkvp7yr2c2ax9wwuvc37mznww92wqgalq5v",
 *   senderId: "8809612781018",
 *   brand: "Nishchinte",
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // false
 *
 * // Standard SMS dispatch:
 * const result = await sms.send({
 *   recipient: "01322122109",
 *   message: "Your order #1001 has been confirmed!",
 * });
 *
 * // Balance Check:
 * const balance = await sms.getBalance();
 * console.log("Current Balance:", balance.balance, balance.currency);
 * ```
 */
export function zendSms(config: ZendSmsConfig): ZendSmsPlugin {
  if (!config?.apiKey) {
    throw new Error("zendSms plugin requires a valid `apiKey`.");
  }
  if (!config?.senderId) {
    throw new Error("zendSms plugin requires a valid `senderId`.");
  }

  const baseUrl = (config.baseUrl || "https://api.zendsms.com").replace(
    /\/+$/,
    "",
  );

  /**
   * Internal handler for SMS dispatch via Zend SMS API (`POST /api/v1/send-sms`).
   */
  const sendSmsHandler = async (
    message: ZendSmsMessage,
  ): Promise<ZendSmsSendResult> => {
    try {
      const recipient = formatBdMobile(message.recipient);
      if (!recipient) {
        return {
          success: false,
          provider: "zendsms",
          statusCode: 400,
          error: "No valid recipient phone number provided.",
        };
      }

      const senderId = message.senderId || config.senderId;
      const clientRef =
        message.clientRef ||
        (message.metadata?.client_ref as string) ||
        (message.metadata?.clientRef as string);

      const payload: Record<string, any> = {
        recipient,
        sender_id: senderId,
        message: message.message,
      };

      if (clientRef) {
        payload.client_ref = clientRef;
      }

      const res = await fetch(`${baseUrl}/api/v1/send-sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json().catch(() => null);

      if (!res.ok && !data) {
        return {
          success: false,
          provider: "zendsms",
          recipient,
          recipientCount: 1,
          statusCode: res.status || 500,
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const isSuccess =
        data?.success === true ||
        data?.code === 1000 ||
        res.status === 200 ||
        res.status === 202;

      if (isSuccess && data?.success !== false) {
        const messageId = String(
          data?.data?.message_id ||
            data?.data?.id ||
            data?.message_id ||
            `znd_${Date.now()}`,
        );

        return {
          success: true,
          provider: "zendsms",
          messageId,
          recipient,
          recipientCount: 1,
          smsCount: data?.data?.units ?? data?.data?.sms_count ?? 1,
          statusCode: 200,
          raw: data,
        };
      }

      const codeDescription = data?.code
        ? ZEND_SMS_ERROR_CODES[data.code]
        : null;
      const errorMessage =
        data?.message ||
        codeDescription ||
        (data?.code
          ? `Zend SMS error ${data.code}`
          : "Failed to send SMS via Zend SMS");

      return {
        success: false,
        provider: "zendsms",
        recipient,
        recipientCount: 1,
        statusCode: mapZendCodeToHttp(data?.code, res.status),
        error: errorMessage,
        raw: data,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "zendsms",
        statusCode: 500,
        error: err.message || "Network error while calling Zend SMS API",
      };
    }
  };

  return {
    name: "zendsms",
    defaultSenderId: config.senderId,
    bulkSupport: false,

    send: sendSmsHandler,

    async verify(): Promise<SmsVerifyResult> {
      try {
        const res = await fetch(`${baseUrl}/api/v1/balance`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            Accept: "application/json",
          },
        });

        const data: any = await res.json().catch(() => null);

        if (
          data?.success === true ||
          data?.code === 1000 ||
          res.status === 200
        ) {
          return { success: true, provider: "zendsms", statusCode: 200, raw: data };
        }

        const codeDescription = data?.code
          ? ZEND_SMS_ERROR_CODES[data.code]
          : null;
        const statusCode = mapZendCodeToHttp(data?.code, res.status);
        return {
          success: false,
          provider: "zendsms",
          statusCode,
          error:
            data?.message ||
            codeDescription ||
            "Zend SMS verification failed",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "zendsms",
          statusCode: 500,
          error:
            err.message ||
            "Connection error while verifying Zend SMS credentials",
        };
      }
    },

    async getBalance(): Promise<ZendSmsBalanceResult> {
      try {
        const res = await fetch(`${baseUrl}/api/v1/balance`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            Accept: "application/json",
          },
        });

        const data: any = await res.json().catch(() => null);

        if (data?.success === true || data?.code === 1000) {
          const balance =
            data?.data?.balance ??
            data?.data?.wallet_balance ??
            data?.data?.amount ??
            data?.data;

          return {
            success: true,
            provider: "zendsms",
            balance: balance !== undefined ? balance : undefined,
            currency: data?.data?.currency || "BDT",
            statusCode: 200,
            data: data?.data,
            raw: data,
          };
        }

        const codeDescription = data?.code
          ? ZEND_SMS_ERROR_CODES[data.code]
          : null;
        const statusCode = mapZendCodeToHttp(data?.code, res.status);
        return {
          success: false,
          provider: "zendsms",
          statusCode,
          error:
            data?.message ||
            codeDescription ||
            "Failed to fetch Zend SMS balance",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "zendsms",
          statusCode: 500,
          error: err.message || "Failed to fetch Zend SMS balance",
        };
      }
    },
  };
}
