/**
 * @fileoverview SSL Wireless (SMS Plus API v3) Plugin for Nishchinte SMS Engine.
 * Provides integration with SSL Wireless API for transactional SMS dispatch and balance checks.
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
 * Configuration options for SSL Wireless (SMS Plus).
 */
export interface SslWirelessConfig {
  /**
   * API Key provided by SSL Wireless.
   */
  apiKey?: string;

  /**
   * Alias for apiKey.
   */
  apiToken?: string;

  /**
   * Stakeholder ID (SID) assigned by SSL Wireless.
   */
  sid: string;

  /**
   * Optional custom prefix for unique client SMS transaction IDs.
   * @default "CSMS"
   */
  csmsIdPrefix?: string;

  /**
   * Optional custom API base URL.
   * @default "https://smsplus.sslwireless.com/api/v3"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload for SSL Wireless.
 */
export interface SslWirelessMessage extends BaseSmsMessage {
  /**
   * Optional custom client SMS reference ID (alphanumeric, max 20 chars).
   */
  csmsId?: string;
}

/**
 * Result object returned when sending SMS via SSL Wireless.
 */
export interface SslWirelessSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "sslwireless";

  /**
   * Custom client SMS reference ID.
   */
  csmsId?: string;

  /**
   * Gateway internal SMS ID.
   */
  smsId?: string;

  /**
   * Additional response data.
   */
  data?: unknown;
}

/**
 * Balance check result for SSL Wireless.
 */
export interface SslWirelessBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "sslwireless";
}

/**
 * Pluggable SSL Wireless driver interface.
 */
export interface SslWirelessPlugin extends SmsPlugin<
  SslWirelessMessage,
  SslWirelessSendResult
> {
  /**
   * Unique plugin identifier.
   */
  name: "sslwireless";

  /**
   * Default stakeholder ID / sender name.
   */
  defaultSenderId: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: false;

  /**
   * Sends an SMS message via SSL Wireless (`POST /send-sms`).
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link SslWirelessSendResult}.
   */
  send(message: SslWirelessMessage): Promise<SslWirelessSendResult>;

  /**
   * Checks current SMS account balance from SSL Wireless (`POST /balance`).
   *
   * @returns A promise resolving to {@link SslWirelessBalanceResult}.
   */
  getBalance(): Promise<SslWirelessBalanceResult>;

  /**
   * Verifies API credentials and connectivity to SSL Wireless API.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

function mapSslWirelessCodeToHttp(
  statusCode?: string | number,
  resStatus?: number,
): number {
  const code = Number(statusCode);
  if (code === 200 || statusCode === "SUCCESS" || statusCode === "200")
    return 200;
  if (code === 401 || statusCode === "401") return 401; // Invalid api_token
  if (code === 403 || statusCode === "403") return 403; // Invalid sid / forbidden
  if (code === 402 || statusCode === "402") return 402; // Insufficient balance
  if (code === 400 || statusCode === "400") return 400; // Bad request / invalid recipient
  if (code && code >= 200 && code < 600) return code;
  if (resStatus && resStatus >= 200 && resStatus < 600) return resStatus;
  return 500;
}

/**
 * Creates an SSL Wireless (SMS Plus API v3) SMS plugin.
 *
 * @param config - {@link SslWirelessConfig} credentials and settings.
 * @returns An {@link SslWirelessPlugin} instance for SSL Wireless.
 *
 * @example
 * ```typescript
 * import { sslWirelessSms } from "@nishchinte/sms";
 *
 * const sms = sslWirelessSms({
 *   apiKey: "your_ssl_api_token",
 *   sid: "your_stakeholder_id",
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // false
 * ```
 */
export function sslWirelessSms(config: SslWirelessConfig): SslWirelessPlugin {
  const activeApiKey = config?.apiKey || config?.apiToken;
  if (!activeApiKey) {
    throw new Error("sslWirelessSms plugin requires a valid `apiKey`.");
  }
  if (!config?.sid) {
    throw new Error("sslWirelessSms plugin requires a valid `sid`.");
  }

  const baseUrl = (
    config.baseUrl || "https://smsplus.sslwireless.com/api/v3"
  ).replace(/\/+$/, "");

  const generateCsmsId = (prefix = config.csmsIdPrefix || "CSMS"): string => {
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
    const timestamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${cleanPrefix}${timestamp}${rand}`.slice(0, 20);
  };

  return {
    name: "sslwireless",
    defaultSenderId: config.sid,
    bulkSupport: false,

    async send(message: SslWirelessMessage): Promise<SslWirelessSendResult> {
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
            provider: "sslwireless",
            statusCode: 400,
            error: "No valid recipient phone number provided.",
          };
        }

        const endpoint = `${baseUrl}/send-sms`;
        const csmsId = message.csmsId || generateCsmsId();

        const payload: Record<string, any> = {
          api_token: activeApiKey,
          sid: message.senderId || config.sid,
          sms: message.message,
          msisdn: recipient,
          csms_id: csmsId,
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data: any = await res.json().catch(() => null);

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "sslwireless",
            recipient,
            recipientCount: 1,
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
          };
        }

        const isSuccess =
          data?.status?.toUpperCase() === "SUCCESS" ||
          data?.status_code === 200 ||
          data?.status_code === "200" ||
          data?.smsinfo?.[0]?.sms_status?.toUpperCase() === "SUCCESS";

        if (isSuccess) {
          const messageId = String(
            data?.smsinfo?.[0]?.sms_id ||
              data?.smsinfo?.[0]?.csms_id ||
              data?.csms_id ||
              csmsId,
          );

          return {
            success: true,
            provider: "sslwireless",
            messageId,
            recipient,
            recipientCount: 1,
            smsCount: 1,
            statusCode: 200,
            csmsId: data?.smsinfo?.[0]?.csms_id || data?.csms_id || csmsId,
            smsId: data?.smsinfo?.[0]?.sms_id,
            data,
            raw: data,
          };
        }

        const statusCode = mapSslWirelessCodeToHttp(
          data?.status_code || data?.status,
          res.status,
        );
        const errorMessage =
          data?.error_message ||
          data?.status_message ||
          data?.smsinfo?.[0]?.status_message ||
          data?.smsinfo?.[0]?.error_message ||
          data?.message ||
          (data?.status
            ? `SSL Wireless ${data.status} (${data.status_code || res.status})`
            : null) ||
          `SSL Wireless Error (Code ${data?.status_code || res.status})`;

        return {
          success: false,
          provider: "sslwireless",
          recipient,
          recipientCount: 1,
          statusCode,
          error: errorMessage,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "sslwireless",
          statusCode: 500,
          error: err.message || "Network error while calling SSL Wireless API",
        };
      }
    },

    async verify(): Promise<SmsVerifyResult> {
      try {
        const res = await fetch(`${baseUrl}/send-sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            api_token: activeApiKey,
            sid: config.sid,
            msisdn: "8801700000000",
            sms: "PING",
            csms_id: generateCsmsId("PING"),
          }),
        });

        const data: any = await res.json().catch(() => null);

        if (
          data?.status_code === 401 ||
          data?.status_code === 403 ||
          data?.status_code === "401" ||
          data?.status_code === "403" ||
          data?.error_message?.toLowerCase()?.includes("unauthorized") ||
          data?.error_message?.toLowerCase()?.includes("invalid api") ||
          data?.error_message?.toLowerCase()?.includes("invalid token") ||
          data?.error_message?.toLowerCase()?.includes("invalid sid")
        ) {
          const statusCode = mapSslWirelessCodeToHttp(data?.status_code, res.status);
          return {
            success: false,
            provider: "sslwireless",
            statusCode,
            error:
              data?.error_message ||
              data?.status_message ||
              "Invalid SSL Wireless apiKey or sid",
            raw: data,
          };
        }

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "sslwireless",
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
          };
        }

        return { success: true, provider: "sslwireless", statusCode: 200, raw: data };
      } catch (err: any) {
        return {
          success: false,
          provider: "sslwireless",
          statusCode: 500,
          error:
            err.message ||
            "Connection error while verifying SSL Wireless credentials",
        };
      }
    },

    async getBalance(): Promise<SslWirelessBalanceResult> {
      try {
        const res = await fetch(`${baseUrl}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            api_token: activeApiKey,
            sid: config.sid,
          }),
        });

        const data: any = await res.json().catch(() => null);

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "sslwireless",
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
          };
        }

        const balance =
          data?.balance ?? data?.balance_amount ?? data?.data?.balance;

        if (balance !== undefined) {
          return {
            success: true,
            provider: "sslwireless",
            balance: String(balance),
            statusCode: 200,
            raw: data,
          };
        }

        const statusCode = mapSslWirelessCodeToHttp(data?.status_code, res.status);

        if (data?.error_message || data?.status_message) {
          return {
            success: false,
            provider: "sslwireless",
            statusCode,
            error: data.error_message || data.status_message,
            raw: data,
          };
        }

        return {
          success: false,
          provider: "sslwireless",
          statusCode: 400,
          error:
            "Balance inquiry endpoint not available on current SSL Wireless account",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "sslwireless",
          statusCode: 500,
          error: err.message || "Failed to fetch SSL Wireless balance",
        };
      }
    },
  };
}
