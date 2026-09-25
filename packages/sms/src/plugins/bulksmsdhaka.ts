/**
 * @fileoverview Bulk SMS Dhaka (bulksmsdhaka.net) Plugin for Nishchinte SMS Engine.
 * Provides integration with Bulk SMS Dhaka API for transactional SMS dispatch and account balance checks.
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
 * Configuration options for Bulk SMS Dhaka (bulksmsdhaka.net) plugin.
 */
export interface BulkSmsDhakaConfig {
  /**
   * API Key provided by Bulk SMS Dhaka.
   */
  apiKey: string;

  /**
   * Caller ID / Brand Name (e.g. "1234" for non-masking or Brand Name for masking).
   */
  senderId?: string;

  /**
   * Optional custom API base URL.
   * @default "https://bulksmsdhaka.net/api"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload for Bulk SMS Dhaka.
 */
export interface BulkSmsDhakaMessage extends BaseSmsMessage {}

/**
 * Result object returned when sending SMS via Bulk SMS Dhaka.
 */
export interface BulkSmsDhakaSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "bulksmsdhaka";
}

/**
 * Balance check result for Bulk SMS Dhaka.
 */
export interface BulkSmsDhakaBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "bulksmsdhaka";
}

/**
 * Pluggable Bulk SMS Dhaka driver interface.
 */
export interface BulkSmsDhakaPlugin extends SmsPlugin<
  BulkSmsDhakaMessage,
  BulkSmsDhakaSendResult
> {
  /**
   * Unique plugin identifier.
   */
  name: "bulksmsdhaka";

  /**
   * Default sender ID or masking name.
   */
  defaultSenderId: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: false;

  /**
   * Sends an SMS message via Bulk SMS Dhaka (`POST /sendtext`).
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link BulkSmsDhakaSendResult}.
   */
  send(message: BulkSmsDhakaMessage): Promise<BulkSmsDhakaSendResult>;

  /**
   * Checks current SMS account balance from Bulk SMS Dhaka (`GET /api/getBalance`).
   *
   * @returns A promise resolving to {@link BulkSmsDhakaBalanceResult}.
   */
  getBalance(): Promise<BulkSmsDhakaBalanceResult>;

  /**
   * Verifies API credentials and connectivity to Bulk SMS Dhaka API.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

function mapBulkSmsDhakaCodeToHttp(
  statusCode?: string | number,
  resStatus?: number,
): number {
  const code = Number(statusCode);
  if (code === 1000 || code === 1001 || code === 1002) return 200;
  if (code === 1015 || code === 1018) return 401; // Auth / API key
  if (code === 1008 || code === 1009 || code === 1010) return 403; // IP / Account
  if (code === 1005) return 422; // Spam
  if (
    code === 1003 ||
    code === 1006 ||
    code === 1011 ||
    code === 1012 ||
    code === 1016 ||
    code === 1017
  )
    return 400;
  if (code === 2001 || code === 1013) return 402; // Insufficient balance / validity
  if (code === 1014) return 500;
  if (resStatus && resStatus >= 200 && resStatus < 600) return resStatus;
  return 500;
}

const BULKSMS_DHAKA_ERROR_CODES: Record<string | number, string> = {
  1000: "SMS request successful",
  1001: "Request sent",
  1002: "Request pending",
  1003: "Request failed",
  1005: "SPAM Detected",
  1006: "SMS Content Validation Fails",
  1008: "IP Not whitelisted",
  1009: "Account Not Verified, Please Contact Administrator",
  1010: "Account Owner is disabled",
  1011: "Sender ID not found for this API Key",
  1012: "Masking SMS must be sent in Bengali",
  1013: "Balance Validity Not Available",
  1014: "Internal server error occurred",
  1015: "Authorization failed / Invalid API Key",
  1016: "Message ID not valid or already queried",
  1017: "Message ID not provided",
  1018: "API Key not provided",
  2001: "Insufficient SMS Balance",
};

/**
 * Creates a Bulk SMS Dhaka (bulksmsdhaka.net) SMS plugin.
 *
 * @param config - {@link BulkSmsDhakaConfig} credentials and settings.
 * @returns A {@link BulkSmsDhakaPlugin} instance for Bulk SMS Dhaka.
 *
 * @example
 * ```typescript
 * import { bulkSmsDhakaSms } from "@nishchinte/sms";
 *
 * const sms = bulkSmsDhakaSms({
 *   apiKey: "your_api_key",
 *   senderId: "1234", // Non-masking number or Brand Name
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // false
 * ```
 */
export function bulkSmsDhakaSms(
  config: BulkSmsDhakaConfig,
): BulkSmsDhakaPlugin {
  if (!config?.apiKey) {
    throw new Error("bulkSmsDhakaSms plugin requires a valid `apiKey`.");
  }

  const callerId = config.senderId;
  if (!callerId) {
    throw new Error(
      "bulkSmsDhakaSms plugin requires a valid `senderId`.",
    );
  }

  const baseUrl = (config.baseUrl || "https://bulksmsdhaka.net/api").replace(
    /\/+$/,
    "",
  );

  return {
    name: "bulksmsdhaka",
    defaultSenderId: callerId,
    bulkSupport: false,

    async send(message: BulkSmsDhakaMessage): Promise<BulkSmsDhakaSendResult> {
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
            provider: "bulksmsdhaka",
            statusCode: 400,
            error: "No valid recipient phone number provided.",
          };
        }

        const activeCallerId = message.senderId || callerId;
        const endpoint = `${baseUrl}/sendtext`;

        const params = new URLSearchParams({
          apikey: config.apiKey,
          callerID: activeCallerId,
          number: recipient,
          message: message.message,
        });

        const res = await fetch(endpoint, {
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
            provider: "bulksmsdhaka",
            recipient,
            recipientCount: 1,
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
            raw: data,
          };
        }

        const status =
          data?.Status ?? data?.status ?? data?.status_code ?? data?.statusCode;
        const successField = String(
          data?.Success ?? data?.success ?? "",
        ).toLowerCase();

        const isSuccess =
          status === "1000" ||
          status === 1000 ||
          status === "1001" ||
          status === 1001 ||
          successField === "true" ||
          (typeof rawText === "string" && rawText.includes("1000"));

        if (isSuccess) {
          const messageId = String(
            data?.messageid ||
              data?.message_id ||
              data?.Message_Id ||
              `bsmsd_${Date.now()}`,
          );

          return {
            success: true,
            provider: "bulksmsdhaka",
            messageId,
            recipient,
            recipientCount: 1,
            smsCount: 1,
            statusCode: 200,
            raw: data,
          };
        }

        const statusCodeNum = Number(status);
        const codeDescription = !isNaN(statusCodeNum)
          ? BULKSMS_DHAKA_ERROR_CODES[statusCodeNum]
          : null;

        const errorMessage =
          data?.Message ||
          data?.message ||
          data?.error_message ||
          data?.error ||
          codeDescription ||
          (status
            ? `Bulk SMS Dhaka error code ${status}`
            : "Failed to send SMS via Bulk SMS Dhaka");

        return {
          success: false,
          provider: "bulksmsdhaka",
          recipient,
          recipientCount: 1,
          statusCode: mapBulkSmsDhakaCodeToHttp(status, res.status),
          error: errorMessage,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "bulksmsdhaka",
          statusCode: 500,
          error:
            err.message || "Network error while calling Bulk SMS Dhaka API",
        };
      }
    },

    async verify(): Promise<SmsVerifyResult> {
      try {
        const res = await fetch(
          `${baseUrl}/getBalance?apikey=${encodeURIComponent(config.apiKey)}`,
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
          data = { balance: rawText.trim() };
        }

        const status = data?.Status ?? data?.status;

        if (!res.ok) {
          return {
            success: false,
            provider: "bulksmsdhaka",
            statusCode: res.status || 500,
            error: `Failed to verify credentials: HTTP ${res.status}`,
            raw: data,
          };
        }

        if (
          status === "1015" ||
          status === 1015 ||
          status === "1018" ||
          status === 1018
        ) {
          return {
            success: false,
            provider: "bulksmsdhaka",
            statusCode: 401,
            error:
              BULKSMS_DHAKA_ERROR_CODES[Number(status)] ||
              "Authorization failed",
            raw: data,
          };
        }

        return {
          success: true,
          provider: "bulksmsdhaka",
          statusCode: 200,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "bulksmsdhaka",
          statusCode: 500,
          error:
            err.message ||
            "Connection error while verifying Bulk SMS Dhaka credentials",
        };
      }
    },

    async getBalance(): Promise<BulkSmsDhakaBalanceResult> {
      try {
        const res = await fetch(
          `${baseUrl}/getBalance?apikey=${encodeURIComponent(config.apiKey)}`,
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
          data = { balance: rawText.trim() };
        }

        if (!res.ok) {
          const status = data?.Status ?? data?.status;
          const statusCode = mapBulkSmsDhakaCodeToHttp(status, res.status);
          return {
            success: false,
            provider: "bulksmsdhaka",
            statusCode,
            error:
              data?.error ||
              data?.message ||
              (status ? BULKSMS_DHAKA_ERROR_CODES[Number(status)] : null) ||
              "Failed to fetch Bulk SMS Dhaka balance",
            raw: data,
          };
        }

        const balance =
          data?.balance ??
          data?.Balance ??
          data?.balance_amount ??
          data?.credit ??
          data?.credits;

        if (balance !== undefined) {
          return {
            success: true,
            provider: "bulksmsdhaka",
            balance: String(balance),
            statusCode: 200,
            raw: data,
          };
        }

        if (typeof data === "string" && !isNaN(Number(data.trim()))) {
          return {
            success: true,
            provider: "bulksmsdhaka",
            balance: data.trim(),
            statusCode: 200,
            raw: data,
          };
        }

        const status = data?.Status ?? data?.status;
        if (status && BULKSMS_DHAKA_ERROR_CODES[Number(status)]) {
          return {
            success: false,
            provider: "bulksmsdhaka",
            statusCode: mapBulkSmsDhakaCodeToHttp(status, res.status),
            error: BULKSMS_DHAKA_ERROR_CODES[Number(status)],
            raw: data,
          };
        }

        return {
          success: true,
          provider: "bulksmsdhaka",
          balance: String(data?.rawResponse || rawText || "0"),
          statusCode: 200,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "bulksmsdhaka",
          statusCode: 500,
          error: err.message || "Failed to fetch Bulk SMS Dhaka balance",
        };
      }
    },
  };
}
