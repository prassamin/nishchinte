/**
 * @fileoverview BulkSMS BD (bulksmsbd.net) Plugin for Nishchinte SMS Engine.
 * Provides integration with BulkSMS BD API for single/bulk SMS dispatch and account balance checks.
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
 * Configuration options for the BulkSMS BD (bulksmsbd.net) plugin.
 */
export interface BulkSmsBdConfig {
  /**
   * API Key provided by BulkSMS BD.
   */
  apiKey: string;

  /**
   * Approved Sender ID / Masking name.
   */
  senderId?: string;

  /**
   * Optional custom API base URL.
   * @default "https://bulksmsbd.net/api"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload for BulkSMS BD.
 */
export interface BulkSmsBdMessage extends BaseSmsMessage {
  /**
   * Recipient phone number (single string, array of strings, or comma-separated string).
   */
  recipient: string | string[];
}

/**
 * Result object returned when sending SMS via BulkSMS BD.
 */
export interface BulkSmsBdSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "bulksmsbd";

  /**
   * Response code returned by BulkSMS BD.
   */
  responseCode?: number;
}

/**
 * Balance check result for BulkSMS BD.
 */
export interface BulkSmsBdBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "bulksmsbd";
}

/**
 * Pluggable BulkSMS BD driver interface.
 */
export interface BulkSmsBdPlugin
  extends SmsPlugin<BulkSmsBdMessage, BulkSmsBdSendResult> {
  /**
   * Unique plugin identifier.
   */
  name: "bulksmsbd";

  /**
   * Default sender ID or masking name.
   */
  defaultSenderId?: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: true;

  /**
   * Sends an SMS message via BulkSMS BD (`POST /api/smsapi`).
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link BulkSmsBdSendResult}.
   */
  send(message: BulkSmsBdMessage): Promise<BulkSmsBdSendResult>;

  /**
   * Checks current SMS account balance from BulkSMS BD (`GET /api/getBalanceApi`).
   *
   * @returns A promise resolving to {@link BulkSmsBdBalanceResult}.
   */
  getBalance(): Promise<BulkSmsBdBalanceResult>;

  /**
   * Verifies API credentials and connectivity to BulkSMS BD API.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

function mapBulkSmsBdCodeToHttp(
  responseCode?: number | string,
  resStatus?: number,
): number {
  const code = Number(responseCode);
  if (code === 200 || code === 202) return 200;
  if (code === 1001) return 401; // Invalid API Key
  if (code === 1007) return 402; // Insufficient Balance
  if (code === 1008 || code === 1009 || code === 1011) return 403; // Forbidden / Suspended / IP Not Whitelisted
  if (code === 1010) return 404; // Not Found
  if (code === 1012) return 422; // Spam Content
  if (code >= 1002 && code <= 1006) return 400; // Bad Request
  if (resStatus && resStatus >= 200 && resStatus < 600) return resStatus;
  return 500;
}

const BULKSMS_BD_ERROR_CODES: Record<number | string, string> = {
  200: "Success",
  202: "SMS Submitted Successfully",
  1001: "Invalid API Key",
  1002: "Empty or Invalid Sender ID",
  1003: "Empty or Invalid Mobile Number",
  1004: "Message content is empty",
  1005: "Message type not specified",
  1006: "Message type mismatch",
  1007: "Insufficient SMS Balance",
  1008: "Account is inactive or suspended",
  1009: "Sender ID not approved",
  1010: "Campaign not found",
  1011: "IP address not whitelisted",
  1012: "Spam content detected",
};

/**
 * Creates a BulkSMS BD (bulksmsbd.net) SMS plugin.
 *
 * @param config - {@link BulkSmsBdConfig} credentials and settings.
 * @returns A {@link BulkSmsBdPlugin} instance for BulkSMS BD.
 *
 * @example
 * ```typescript
 * import { bulkSmsBdSms } from "@nishchinte/sms";
 *
 * const sms = bulkSmsBdSms({
 *   apiKey: "your_bulksmsbd_api_key",
 *   senderId: "your_sender_id",
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // true
 * ```
 */
export function bulkSmsBdSms(config: BulkSmsBdConfig): BulkSmsBdPlugin {
  if (!config?.apiKey) {
    throw new Error("bulkSmsBdSms plugin requires a valid `apiKey`.");
  }

  const baseUrl = (config.baseUrl || "https://bulksmsbd.net/api")
    .replace(/\/+$/, "")
    .replace(/\/smsapi$/, "");

  return {
    name: "bulksmsbd",
    defaultSenderId: config.senderId,
    bulkSupport: true,

    async send(message: BulkSmsBdMessage): Promise<BulkSmsBdSendResult> {
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
            provider: "bulksmsbd",
            statusCode: 400,
            error: "No valid recipient phone number provided.",
          };
        }

        const recipientList = recipient.split(",");
        const recipientParam =
          recipientList.length === 1 ? recipientList[0] : recipientList;
        const recipientCount = recipientList.length;

        const sender = message.senderId || config.senderId;
        if (!sender) {
          return {
            success: false,
            provider: "bulksmsbd",
            recipient: recipientParam,
            recipientCount,
            statusCode: 400,
            error: "No valid senderId provided.",
          };
        }

        const params = new URLSearchParams({
          api_key: config.apiKey,
          senderid: sender,
          number: recipient,
          message: message.message,
        });

        const res = await fetch(`${baseUrl}/smsapi`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json, text/plain, */*",
          },
          body: params.toString(),
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
            provider: "bulksmsbd",
            recipient: recipientParam,
            recipientCount,
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
            raw: data,
          };
        }

        const responseCode = Number(data?.response_code);

        // 202 = SMS Submitted Successfully, 200 = Success
        if (responseCode === 202 || responseCode === 200) {
          return {
            success: true,
            provider: "bulksmsbd",
            messageId: String(data.message_id || `bsms_${Date.now()}`),
            recipient: recipientParam,
            recipientCount,
            smsCount: 1,
            statusCode: 200,
            responseCode,
            raw: data,
          };
        }

        const codeDescription = !isNaN(responseCode)
          ? BULKSMS_BD_ERROR_CODES[responseCode]
          : null;

        return {
          success: false,
          provider: "bulksmsbd",
          recipient: recipientParam,
          recipientCount,
          statusCode: mapBulkSmsBdCodeToHttp(data?.response_code, res.status),
          responseCode: !isNaN(responseCode) ? responseCode : undefined,
          error:
            data?.error_message ||
            codeDescription ||
            `BulkSMS BD error code ${data?.response_code || res.status}`,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "bulksmsbd",
          statusCode: 500,
          error: err.message || "Network error while calling BulkSMS BD API",
        };
      }
    },

    async verify(): Promise<SmsVerifyResult> {
      try {
        const res = await fetch(
          `${baseUrl}/getBalanceApi?api_key=${encodeURIComponent(config.apiKey)}`,
          {
            method: "GET",
            headers: { Accept: "application/json, text/plain, */*" },
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
            provider: "bulksmsbd",
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
            raw: data,
          };
        }

        const responseCode = Number(data?.response_code);

        if (
          responseCode === 200 ||
          responseCode === 202 ||
          data?.balance !== undefined
        ) {
          return {
            success: true,
            provider: "bulksmsbd",
            statusCode: 200,
            raw: data,
          };
        }

        const statusCode = mapBulkSmsBdCodeToHttp(
          data?.response_code,
          res.status,
        );

        return {
          success: false,
          provider: "bulksmsbd",
          statusCode,
          error:
            data?.error_message ||
            (!isNaN(responseCode)
              ? BULKSMS_BD_ERROR_CODES[responseCode]
              : null) ||
            "Invalid BulkSMS BD API credentials",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "bulksmsbd",
          statusCode: 500,
          error:
            err.message ||
            "Connection error while verifying BulkSMS BD credentials",
        };
      }
    },

    async getBalance(): Promise<BulkSmsBdBalanceResult> {
      try {
        const res = await fetch(
          `${baseUrl}/getBalanceApi?api_key=${encodeURIComponent(config.apiKey)}`,
          {
            method: "GET",
            headers: { Accept: "application/json, text/plain, */*" },
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
            provider: "bulksmsbd",
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
            raw: data,
          };
        }

        if (data?.balance !== undefined) {
          return {
            success: true,
            provider: "bulksmsbd",
            balance: String(data.balance),
            statusCode: 200,
            raw: data,
          };
        }

        const responseCode = Number(data?.response_code);
        const statusCode = mapBulkSmsBdCodeToHttp(
          data?.response_code,
          res.status,
        );

        return {
          success: false,
          provider: "bulksmsbd",
          statusCode,
          error:
            data?.error_message ||
            (!isNaN(responseCode)
              ? BULKSMS_BD_ERROR_CODES[responseCode]
              : null) ||
            "Failed to fetch BulkSMS BD balance",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "bulksmsbd",
          statusCode: 500,
          error: err.message || "Failed to fetch BulkSMS BD balance",
        };
      }
    },
  };
}
