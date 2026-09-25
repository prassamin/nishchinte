/**
 * @fileoverview Alpha SMS (sms.net.bd / alpha.net.bd) Plugin for Nishchinte SMS Engine.
 * Provides integration with Alpha SMS API for standard/bulk SMS dispatch and account balance inquiries.
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
 * Configuration options required to initialize the Alpha SMS plugin.
 */
export interface AlphaSmsConfig {
  /**
   * API Key provided by Alpha SMS / sms.net.bd.
   *
   * @example "your_alpha_api_key"
   */
  apiKey: string;

  /**
   * Optional approved Sender ID / Masking name.
   */
  senderId?: string;

  /**
   * Optional approved campaign content ID for template/bulk SMS.
   */
  contentId?: string;

  /**
   * Optional custom API base URL.
   *
   * @default "https://api.sms.net.bd"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload for Alpha SMS.
 */
export interface AlphaSmsMessage extends BaseSmsMessage {
  /**
   * Recipient phone number (e.g. "017XXXXXXXX", "+88017XXXXXXXX", array, or comma-separated string).
   */
  recipient: string | string[];

  /**
   * Approved campaign content ID for bulk/template messages.
   */
  contentId?: string;
}

/**
 * Result object returned when sending an SMS via Alpha SMS.
 */
export interface AlphaSmsSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "alpha";

  /**
   * Unique request ID assigned by Alpha SMS gateway.
   */
  requestId?: string | number;
}

/**
 * Balance check result for Alpha SMS.
 */
export interface AlphaSmsBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "alpha";

  /**
   * Remaining balance or credits.
   */
  balance?: string | number;
}

/**
 * Pluggable Alpha SMS driver interface.
 */
export interface AlphaSmsPlugin extends SmsPlugin<AlphaSmsMessage, AlphaSmsSendResult> {
  /**
   * Unique plugin identifier.
   */
  name: "alpha";

  /**
   * Default sender ID or masking name.
   */
  defaultSenderId?: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: true;

  /**
   * Sends an SMS message via Alpha SMS (`POST /sendsms`).
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link AlphaSmsSendResult}.
   */
  send(message: AlphaSmsMessage): Promise<AlphaSmsSendResult>;

  /**
   * Retrieves current SMS credit balance from Alpha SMS (`GET /user/balance`).
   *
   * @returns A promise resolving to {@link AlphaSmsBalanceResult}.
   */
  getBalance(): Promise<AlphaSmsBalanceResult>;

  /**
   * Verifies API credentials and connectivity to Alpha SMS API.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

function mapAlphaCodeToHttp(errorCode?: number | string | null, resStatus?: number): number {
  const code = Number(errorCode);
  if (code === 0) return 200;
  if (code === 400 || (code >= 412 && code <= 416)) return 400; // Bad request
  if (code === 405) return 401; // Invalid API Key
  if (code === 403 || code === 410 || code === 411 || code === 420 || code === 421) return 403; // Forbidden
  if (code === 404) return 404; // Not found
  if (code === 417) return 402; // Insufficient SMS balance
  if (code === 409) return 500;
  if (resStatus && resStatus >= 200 && resStatus < 600) return resStatus;
  return 500;
}

const ALPHA_ERROR_CODES: Record<number, string> = {
  0: "Success",
  400: "Request rejected due to missing or invalid parameters",
  403: "You do not have permission to perform this request",
  404: "Requested resource not found",
  405: "Authorization required / Invalid API Key",
  409: "Unknown error occurred on Alpha SMS server",
  410: "Alpha SMS account expired",
  411: "Reseller account expired or suspended",
  412: "Invalid schedule format (Must be Y-m-d H:i:s)",
  413: "Invalid Sender ID",
  414: "Message content is empty",
  415: "Message content is too long",
  416: "No valid recipient phone number found",
  417: "Insufficient SMS balance",
  420: "Content blocked / filtered by operator",
  421: "Unrecharged account: SMS can only be sent to registered phone number",
};

/**
 * Creates an Alpha SMS (alpha.net.bd / sms.net.bd) SMS plugin.
 *
 * @param config - {@link AlphaSmsConfig} credentials and settings.
 * @returns An {@link AlphaSmsPlugin} instance for Alpha SMS.
 *
 * @example
 * ```typescript
 * import { alphaSms } from "@nishchinte/sms";
 *
 * const sms = alphaSms({
 *   apiKey: "your_alpha_api_key",
 *   senderId: "YOUR_MASKING", // optional
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // true
 * ```
 */
export function alphaSms(config: AlphaSmsConfig): AlphaSmsPlugin {
  if (!config?.apiKey) {
    throw new Error("alphaSms plugin requires a valid `apiKey`.");
  }

  const baseUrl = (config.baseUrl || "https://api.sms.net.bd").replace(/\/+$/, "");

  return {
    name: "alpha",
    defaultSenderId: config.senderId,
    bulkSupport: true,

    async send(message: AlphaSmsMessage): Promise<AlphaSmsSendResult> {
      try {
        let recipient = "";
        if (Array.isArray(message.recipient)) {
          recipient = message.recipient.map((num) => formatBdMobile(num)).filter(Boolean).join(",");
        } else if (typeof message.recipient === "string" && message.recipient.includes(",")) {
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
            provider: "alpha",
            statusCode: 400,
            error: "No valid recipient phone number provided.",
          };
        }

        const recipientList = recipient.split(",");
        const recipientParam = recipientList.length === 1 ? recipientList[0] : recipientList;
        const recipientCount = recipientList.length;

        const senderId = message.senderId || config.senderId;

        const params = new URLSearchParams({
          api_key: config.apiKey,
          msg: message.message,
          to: recipient,
        });

        if (senderId) {
          params.append("sender_id", senderId);
        }

        // Optional content_id for template campaign
        const contentId =
          message.contentId ||
          (message.metadata?.contentId as string) ||
          (message.metadata?.content_id as string) ||
          config.contentId;
        if (contentId) {
          params.append("content_id", contentId);
        }

        const res = await fetch(`${baseUrl}/sendsms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (!res.ok) {
          return {
            success: false,
            provider: "alpha",
            recipient: recipientParam,
            recipientCount,
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
          };
        }

        const data: any = await res.json().catch(() => null);

        // Alpha SMS returns { error: 0, msg: "...", data: { request_id: 1234 } }
        if (data && (data.error === 0 || data.error === "0")) {
          const messageId =
            data.data?.request_id != null
              ? String(data.data.request_id)
              : `alpha_${Date.now()}`;

          return {
            success: true,
            provider: "alpha",
            messageId,
            recipient: recipientParam,
            recipientCount,
            statusCode: 200,
            requestId: data.data?.request_id,
            raw: data,
          };
        }

        const errorCode = typeof data?.error === "number" ? data.error : null;
        const codeDescription = errorCode !== null ? ALPHA_ERROR_CODES[errorCode] : null;

        const errorMessage =
          data?.msg ||
          data?.error_message ||
          codeDescription ||
          (errorCode !== null ? `Error code ${errorCode}` : "Failed to send SMS via Alpha SMS");

        return {
          success: false,
          provider: "alpha",
          recipient: recipientParam,
          recipientCount,
          statusCode: mapAlphaCodeToHttp(errorCode, res.status),
          error: errorMessage,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "alpha",
          statusCode: 500,
          error: err.message || "Network error while calling Alpha SMS API",
        };
      }
    },

    async verify(): Promise<SmsVerifyResult> {
      try {
        const res = await fetch(
          `${baseUrl}/user/balance/?api_key=${encodeURIComponent(config.apiKey)}`,
        );
        const data: any = await res.json().catch(() => null);

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "alpha",
            statusCode: res.status || 500,
            error: `Failed to verify credentials: HTTP ${res.status}`,
          };
        }

        if (data && (data.error === 0 || data.error === "0")) {
          return { success: true, provider: "alpha", statusCode: 200, raw: data };
        }

        const errorCode = typeof data?.error === "number" ? data.error : null;
        const statusCode = mapAlphaCodeToHttp(errorCode, res.status);

        return {
          success: false,
          provider: "alpha",
          statusCode,
          error: data?.msg || (errorCode !== null ? ALPHA_ERROR_CODES[errorCode] : "Alpha SMS verification failed"),
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "alpha",
          statusCode: 500,
          error: err.message || "Connection error while verifying Alpha SMS credentials",
        };
      }
    },

    async getBalance(): Promise<AlphaSmsBalanceResult> {
      try {
        const res = await fetch(
          `${baseUrl}/user/balance/?api_key=${encodeURIComponent(config.apiKey)}`,
        );
        const data: any = await res.json().catch(() => null);

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "alpha",
            statusCode: res.status || 500,
            error: `Failed to fetch balance: HTTP ${res.status}`,
          };
        }

        if (data && (data.error === 0 || data.error === "0")) {
          const balance = data.data?.balance ?? data.balance ?? data.response;

          return {
            success: true,
            provider: "alpha",
            balance: balance !== undefined ? balance : undefined,
            statusCode: 200,
            raw: data,
          };
        }

        const errorCode = typeof data?.error === "number" ? data.error : null;
        const statusCode = mapAlphaCodeToHttp(errorCode, res.status);

        return {
          success: false,
          provider: "alpha",
          statusCode,
          error: data?.msg || (errorCode !== null ? ALPHA_ERROR_CODES[errorCode] : "Failed to fetch Alpha SMS balance"),
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "alpha",
          statusCode: 500,
          error: err.message || "Failed to fetch Alpha SMS balance",
        };
      }
    },
  };
}
