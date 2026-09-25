/**
 * @fileoverview ESMS BD (esms.com.bd / login.esms.com.bd) Plugin for Nishchinte SMS Engine.
 * Provides integration with ESMS V3 REST API for standard/bulk SMS dispatch and account balance checks.
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
 * Configuration options for ESMS BD (esms.com.bd / login.esms.com.bd) plugin.
 */
export interface EsmsConfig {
  /**
   * API Key / Bearer token provided by ESMS.
   */
  apiKey?: string;

  /**
   * Alias for `apiKey`.
   */
  apiToken?: string;

  /**
   * Approved Sender ID / Masking name (max 11 chars or telephone number).
   */
  senderId: string;

  /**
   * Message format type ("plain" or "unicode").
   * @default "plain"
   */
  type?: "plain" | "unicode";

  /**
   * Optional custom API base URL.
   * @default "https://login.esms.com.bd/api/v3"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload for ESMS BD.
 */
export interface EsmsMessage extends BaseSmsMessage {
  /**
   * Recipient phone number (single string, array of strings, or comma-separated string).
   */
  recipient: string | string[];

  /**
   * Message format type ("plain" for text, "unicode" for Bangla).
   * @default "plain"
   */
  type?: "plain" | "unicode" | "otp" | "transactional" | "marketing";
}

/**
 * Result object returned when sending SMS via ESMS BD.
 */
export interface EsmsSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "esms";

  /**
   * Unique message UID assigned by ESMS.
   */
  uid?: string;
}

/**
 * Balance check result for ESMS BD.
 */
export interface EsmsBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "esms";
}

/**
 * Pluggable ESMS BD driver interface.
 */
export interface EsmsPlugin extends SmsPlugin<EsmsMessage, EsmsSendResult> {
  /**
   * Unique plugin identifier.
   */
  name: "esms";

  /**
   * Default sender ID or masking name.
   */
  defaultSenderId: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: true;

  /**
   * Sends an SMS message via ESMS BD (`POST /sms/send`).
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link EsmsSendResult}.
   */
  send(message: EsmsMessage): Promise<EsmsSendResult>;

  /**
   * Checks current SMS account balance from ESMS BD.
   *
   * @returns A promise resolving to {@link EsmsBalanceResult}.
   */
  getBalance(): Promise<EsmsBalanceResult>;

  /**
   * Verifies API credentials and connectivity to ESMS BD API.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

/**
 * Normalizes ESMS API response status codes into standard HTTP status codes.
 * ESMS frequently returns HTTP 200 with error objects like `{"status": "error", "message": "Unauthenticated."}`.
 */
function mapEsmsResponseToHttp(data: any, resStatus: number): number {
  const msg = String(
    data?.message ||
      data?.error ||
      (typeof data?.data === "string" ? data.data : "") ||
      "",
  ).toLowerCase();

  const statusStr = String(data?.status || "").toLowerCase();

  // 1. Auth failure (e.g. "Unauthenticated.", "Invalid API Key", etc.)
  if (
    resStatus === 401 ||
    msg.includes("unauthenticated") ||
    msg.includes("invalid api") ||
    msg.includes("invalid token") ||
    msg.includes("unauthorized")
  ) {
    return 401;
  }

  // 2. Low balance / Quota exceeded
  if (
    resStatus === 402 ||
    msg.includes("balance") ||
    msg.includes("credit") ||
    msg.includes("quota") ||
    msg.includes("insufficient")
  ) {
    return 402;
  }

  // 3. Permission / Suspended / Blacklisted
  if (
    resStatus === 403 ||
    msg.includes("permission") ||
    msg.includes("suspended") ||
    msg.includes("disabled") ||
    msg.includes("blocked") ||
    msg.includes("not allowed")
  ) {
    return 403;
  }

  // 4. Not Found
  if (resStatus === 404 || msg.includes("not found")) {
    return 404;
  }

  // 5. Validation / Bad request
  if (
    resStatus === 422 ||
    resStatus === 400 ||
    msg.includes("validation") ||
    msg.includes("required") ||
    msg.includes("invalid") ||
    msg.includes("recipient") ||
    msg.includes("sender") ||
    msg.includes("message") ||
    statusStr === "error" ||
    statusStr === "failed" ||
    statusStr === "fail"
  ) {
    return 400;
  }

  // 6. Upstream / Server errors
  if (resStatus >= 500 && resStatus < 600) {
    return resStatus;
  }

  // 7. If HTTP was 200 but response payload was an error, return 400
  if (resStatus >= 200 && resStatus < 300) {
    return 400;
  }

  return 500;
}

/**
 * Checks whether an ESMS response signifies a successful SMS dispatch.
 */
function isEsmsSuccess(data: any, resStatus: number): boolean {
  if (!data) return false;

  const statusStr = String(data?.status || "").toLowerCase();
  const msg = String(data?.message || data?.error || "").toLowerCase();

  // Explicit failure indicators
  if (
    statusStr === "error" ||
    statusStr === "failed" ||
    statusStr === "fail" ||
    msg.includes("unauthenticated") ||
    msg.includes("invalid") ||
    msg.includes("insufficient") ||
    msg.includes("required")
  ) {
    return false;
  }

  // Explicit success indicators
  if (
    statusStr === "success" ||
    statusStr === "ok" ||
    Boolean(data?.data?.uid || data?.data?.id || data?.uid || data?.id)
  ) {
    return true;
  }

  // Fallback: If HTTP 200/201, contains data payload and no error
  return (
    (resStatus === 200 || resStatus === 201) &&
    Boolean(data?.data) &&
    !data?.error
  );
}

/**
 * Creates an ESMS BD (esms.com.bd / login.esms.com.bd) SMS plugin.
 *
 * @param config - {@link EsmsConfig} credentials and settings.
 * @returns An {@link EsmsPlugin} instance for ESMS BD.
 *
 * @example
 * ```typescript
 * import { esmsSms } from "@nishchinte/sms";
 *
 * const sms = esmsSms({
 *   apiKey: "your_esms_api_key",
 *   senderId: "YOUR_BRAND",
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // true
 * ```
 */
export function esmsSms(config: EsmsConfig): EsmsPlugin {
  const activeApiKey = config?.apiKey || config?.apiToken;
  if (!activeApiKey) {
    throw new Error("esmsSms plugin requires a valid `apiKey`.");
  }
  if (!config?.senderId) {
    throw new Error("esmsSms plugin requires a valid `senderId`.");
  }

  const baseUrl = (
    config.baseUrl || "https://login.esms.com.bd/api/v3"
  ).replace(/\/+$/, "");

  return {
    name: "esms",
    defaultSenderId: config.senderId,
    bulkSupport: true,

    async send(message: EsmsMessage): Promise<EsmsSendResult> {
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
            provider: "esms",
            statusCode: 400,
            error: "No valid recipient phone number provided.",
          };
        }

        const recipientList = recipient.split(",");
        const recipientParam =
          recipientList.length === 1 ? recipientList[0] : recipientList;
        const recipientCount = recipientList.length;

        const senderId = message.senderId || config.senderId;
        const payload: Record<string, any> = {
          recipient,
          sender_id: senderId,
          type: message.type || config.type || "plain",
          message: message.message,
        };

        const res = await fetch(`${baseUrl}/sms/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeApiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data: any = await res.json().catch(() => null);

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "esms",
            recipient: recipientParam,
            recipientCount,
            statusCode:
              res.status >= 200 && res.status < 600 ? res.status : 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
          };
        }

        const success = isEsmsSuccess(data, res.status);

        if (success) {
          const messageId = String(
            data?.data?.uid ||
              data?.data?.id ||
              data?.uid ||
              data?.id ||
              `esms_${Date.now()}`,
          );

          return {
            success: true,
            provider: "esms",
            messageId,
            recipient: recipientParam,
            recipientCount,
            smsCount: data?.data?.sms_count || data?.data?.units || 1,
            statusCode: 200,
            uid: data?.data?.uid || data?.uid,
            raw: data,
          };
        }

        const statusCode = mapEsmsResponseToHttp(data, res.status);
        const errorMessage =
          data?.message ||
          data?.error ||
          (typeof data?.data === "string" ? data.data : null) ||
          (data?.status ? `ESMS ${data.status}` : null) ||
          `ESMS error: HTTP ${res.status}`;

        return {
          success: false,
          provider: "esms",
          recipient: recipientParam,
          recipientCount,
          statusCode,
          error: errorMessage,
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "esms",
          statusCode: 500,
          error: err.message || "Network error while calling ESMS API",
        };
      }
    },

    async verify(): Promise<SmsVerifyResult> {
      try {
        const res = await fetch(`${baseUrl}/sms`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${activeApiKey}`,
            Accept: "application/json",
          },
        });

        const data: any = await res.json().catch(() => null);

        const msg = String(data?.message || data?.error || "").toLowerCase();
        const statusStr = String(data?.status || "").toLowerCase();

        if (
          res.status === 401 ||
          res.status === 403 ||
          statusStr === "error" ||
          statusStr === "failed" ||
          msg.includes("unauthenticated") ||
          msg.includes("invalid")
        ) {
          const statusCode = mapEsmsResponseToHttp(data, res.status);
          return {
            success: false,
            provider: "esms",
            statusCode,
            error:
              data?.message ||
              data?.error ||
              "ESMS verification failed",
            raw: data,
          };
        }

        if (!res.ok) {
          return {
            success: false,
            provider: "esms",
            statusCode: res.status || 500,
            error:
              data?.message ||
              data?.error ||
              `HTTP ${res.status}: ${res.statusText}`,
            raw: data,
          };
        }

        return { success: true, provider: "esms", statusCode: 200, raw: data };
      } catch (err: any) {
        return {
          success: false,
          provider: "esms",
          statusCode: 500,
          error:
            err.message || "Connection error while verifying ESMS credentials",
        };
      }
    },

    async getBalance(): Promise<EsmsBalanceResult> {
      try {
        const balanceRes = await fetch(`${baseUrl}/balance`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${activeApiKey}`,
            Accept: "application/json",
          },
        });

        const data: any = await balanceRes.json().catch(() => null);

        if (!balanceRes.ok && !data) {
          return {
            success: false,
            provider: "esms",
            statusCode: balanceRes.status || 500,
            error: `HTTP ${balanceRes.status}: ${balanceRes.statusText}`,
          };
        }

        const msg = String(data?.message || data?.error || "").toLowerCase();
        const statusStr = String(data?.status || "").toLowerCase();

        if (
          balanceRes.status === 401 ||
          balanceRes.status === 403 ||
          statusStr === "error" ||
          statusStr === "failed" ||
          msg.includes("unauthenticated") ||
          msg.includes("invalid")
        ) {
          const statusCode = mapEsmsResponseToHttp(data, balanceRes.status);
          return {
            success: false,
            provider: "esms",
            statusCode,
            error:
              data?.message ||
              data?.error ||
              "Failed to fetch ESMS balance",
            raw: data,
          };
        }

        const balance =
          data?.data?.balance ??
          data?.data?.sms_unit ??
          data?.data?.credits ??
          data?.balance ??
          data?.credits;

        if (balance !== undefined) {
          return {
            success: true,
            provider: "esms",
            balance: String(balance),
            statusCode: 200,
            raw: data,
          };
        }

        return {
          success: false,
          provider: "esms",
          statusCode: 400,
          error:
            data?.message ||
            "Balance inquiry endpoint not available on current ESMS account",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "esms",
          statusCode: 500,
          error: err.message || "Failed to fetch ESMS balance",
        };
      }
    },
  };
}
