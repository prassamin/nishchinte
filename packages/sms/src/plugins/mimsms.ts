/**
 * @fileoverview MimSMS Plugin for Nishchinte SMS Engine.
 * Provides integration with MimSMS V2 REST API (https://api.mimsms.com / https://www.mimsms.com)
 * for high-speed Transactional SMS dispatch (Single GET/POST and OneToMany Bulk Broadcast), and real-time account balance checks.
 *
 * Supported Endpoints in `send()`:
 * - GET `/api/V2/Send`: Single transactional SMS via query parameters.
 * - POST `/api/V2/SMS`: Single transactional SMS via JSON body.
 * - POST `/api/V2/OneToMany`: Bulk broadcast to up to 1,000 numbers with the same message.
 * - POST `/api/V2/BalanceCheck`: Real-time account credit balance inquiry.
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
 * Configuration options required to initialize the MimSMS plugin.
 */
export interface MimSmsConfig {
  /**
   * Secret API Key generated from the MimSMS developer panel under Utility → Developer.
   *
   * @example "ALPHABITAGAMMA"
   */
  apiKey: string;

  /**
   * Registered MimSMS account email address.
   *
   * @example "demo@mimsms.com"
   */
  username: string;

  /**
   * Approved Sender ID or masking number registered in your MimSMS portal (Utility → Sender ID).
   *
   * @example "8809612444598" or "MYBRAND"
   */
  senderId: string;

  /**
   * Optional custom API base URL for proxying or enterprise routing.
   *
   * @default "https://api.mimsms.com"
   */
  baseUrl?: string;
}

/**
 * Outbound SMS message payload tailored for MimSMS V2.
 * Supports:
 * - Single SMS: `{ recipient: "017...", message: "Hello" }` -> `POST /api/V2/SMS` (or `GET /api/V2/Send`)
 * - Bulk Broadcast: `{ recipient: ["017...", "018..."], message: "Hello all" }` -> `POST /api/V2/OneToMany`
 */
export interface MimSmsMessage extends BaseSmsMessage {
  /**
   * Recipient phone number (single string, array of strings, or comma-separated string).
   */
  recipient: string | string[];

  /**
   * Optional custom sender ID overriding configuration default.
   */
  senderId?: string;

  /**
   * Optional label or name for campaign tracking.
   *
   * @example "Order Confirmation"
   */
  campaignName?: string;
}

/**
 * Options for broadcasting a single message to multiple recipients via `POST /api/V2/OneToMany`.
 */
export interface MimSmsOneToManyOptions {
  /**
   * List of recipient phone numbers (array or comma-separated string, max 1000).
   */
  recipient: string[] | string;

  /**
   * Message text content broadcast to all recipients.
   */
  message: string;

  /**
   * Optional custom sender ID overriding configuration default.
   */
  senderId?: string;
}

/**
 * Recipient dispatch success item returned by MimSMS V2.
 */
export interface MimSmsSuccessData {
  /**
   * Normalized recipient mobile number.
   */
  mobNumber: string;

  /**
   * Unique tracking ID assigned to this recipient's SMS.
   */
  trackingId: string;

  /**
   * Number of SMS units consumed.
   */
  sms_Count?: number;

  /**
   * Message encoding/language type (e.g. "Text", "Unicode").
   */
  lang_Type?: string;
}

/**
 * Recipient dispatch failure item returned by MimSMS V2.
 */
export interface MimSmsErrorData {
  /**
   * Recipient mobile number that failed.
   */
  mobNumber?: string;

  /**
   * Error status code or message.
   */
  status?: string;

  /**
   * Explanation for why the message failed.
   */
  reason?: string;

  /**
   * Additional error fields.
   */
  [key: string]: unknown;
}

/**
 * Detailed result object returned after an SMS dispatch attempt via MimSMS V2.
 */
export interface MimSmsSendResult extends SmsSendResult {
  /**
   * The provider name literal.
   */
  provider: "mimsms";

  /**
   * Transaction reference ID returned by MimSMS gateway.
   */
  trxnId?: string;

  /**
   * Specific per-recipient tracking ID from `success_Data`.
   */
  trackingId?: string;

  /**
   * Array of successfully dispatched recipients with tracking IDs.
   */
  successData?: MimSmsSuccessData[];

  /**
   * Array of failed recipients with error reasons.
   */
  errorData?: MimSmsErrorData[];
}

/**
 * Result returned when querying MimSMS account balance (`POST /api/V2/BalanceCheck`).
 */
export interface MimSmsBalanceResult extends SmsBalanceResult {
  /**
   * The provider name literal.
   */
  provider: "mimsms";

  /**
   * Current remaining account credit balance.
   */
  balance?: string | number;

  /**
   * Currency code for the balance amount.
   *
   * @default "BDT"
   */
  currency?: string;

  /**
   * Transaction reference ID from the balance inquiry.
   */
  trxnId?: string;
}

/**
 * MimSMS transport driver interface supporting standard and bulk SMS dispatch and balance checks.
 */
export interface MimSmsPlugin extends SmsPlugin<
  MimSmsMessage,
  MimSmsSendResult
> {
  /**
   * Unique plugin identifier.
   */
  name: "mimsms";

  /**
   * Default sender ID or masking name configured for this driver.
   */
  defaultSenderId: string;

  /**
   * Whether this provider natively supports multiple recipient bulk broadcasting.
   */
  bulkSupport: true;

  /**
   * Sends a transactional SMS message via MimSMS.
   *
   * @param message - The SMS message payload.
   * @returns A promise resolving to {@link MimSmsSendResult}.
   */
  send(message: MimSmsMessage): Promise<MimSmsSendResult>;

  /**
   * Retrieves the current account balance from MimSMS (`POST /api/V2/BalanceCheck`).
   *
   * @returns A promise resolving to {@link MimSmsBalanceResult}.
   */
  getBalance(): Promise<MimSmsBalanceResult>;

  /**
   * Verifies API credentials and connectivity to MimSMS API.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;
}

/**
 * Creates an instance of {@link MimSmsPlugin} for sending transactional SMS via MimSMS V2 REST API.
 *
 * @param config - {@link MimSmsConfig} credentials including API key, username (email), and Sender ID.
 * @returns A fully initialized {@link MimSmsPlugin} instance.
 * @throws {Error} If `apiKey`, `username`, or `senderId` is missing from configuration.
 *
 * @example
 * ```typescript
 * import { mimSms } from "@nishchinte/sms";
 *
 * const sms = mimSms({
 *   apiKey: "ALPHABITAGAMMA",
 *   username: "demo@mimsms.com",
 *   senderId: "8809612444598",
 * });
 *
 * console.log("Bulk support:", sms.bulkSupport); // true
 *
 * // 1. Single SMS (POST /api/V2/SMS):
 * await sms.send({
 *   recipient: "01844909020",
 *   message: "Your OTP is 123456",
 * });
 *
 * // 2. Bulk Broadcast (POST /api/V2/OneToMany):
 * await sms.send({
 *   recipient: ["01844909020", "01713537347"],
 *   message: "Flat 20% discount across our entire store today!",
 * });
 * ```
 */
export function mimSms(config: MimSmsConfig): MimSmsPlugin {
  if (!config?.apiKey) {
    throw new Error("mimSms plugin requires a valid `apiKey`.");
  }
  if (!config?.username) {
    throw new Error(
      "mimSms plugin requires a valid `username` (registered account email).",
    );
  }
  if (!config?.senderId) {
    throw new Error("mimSms plugin requires a valid `senderId`.");
  }

  const baseUrl = (config.baseUrl || "https://api.mimsms.com").replace(
    /\/+$/,
    "",
  );

  /**
   * Parses and standardizes MimSMS V2 response payloads.
   */
  const parseResponse = (
    data: any,
    resStatus: number,
    recipientParam?: string | string[],
    recipientCountParam?: number,
  ): MimSmsSendResult => {
    const rawStatusCode = String(data?.statusCode || data?.StatusCode || "");
    const status = String(data?.status || data?.Status || "");
    const responseResult = String(
      data?.responseResult || data?.ResponseResult || "",
    );

    const isSuccess =
      rawStatusCode === "200" ||
      status.toLowerCase() === "success" ||
      status.toLowerCase() === "ok" ||
      responseResult.toLowerCase().includes("successful") ||
      responseResult.toLowerCase().includes("success");

    const successData: MimSmsSuccessData[] =
      data?.success_Data || data?.successData || [];
    const errorData: MimSmsErrorData[] =
      data?.error_Data || data?.errorData || [];

    const trackingId = successData[0]?.trackingId;
    const trxnId = data?.trxnId || data?.transactionId;
    const messageId = String(trackingId || trxnId || `mim_${Date.now()}`);

    const resolvedHttpCode = isSuccess
      ? 200
      : (rawStatusCode && !isNaN(Number(rawStatusCode)) && Number(rawStatusCode) >= 200 && Number(rawStatusCode) < 600)
        ? Number(rawStatusCode)
        : (resStatus >= 200 && resStatus < 600 ? resStatus : 500);

    const totalSmsCount = successData.reduce((acc, curr) => acc + (curr.sms_Count || 1), 0) || 1;
    const recipientCount = recipientCountParam || (Array.isArray(recipientParam) ? recipientParam.length : 1);

    if (isSuccess && (!errorData.length || successData.length > 0)) {
      return {
        success: true,
        provider: "mimsms",
        messageId,
        recipient: recipientParam,
        recipientCount,
        smsCount: totalSmsCount,
        statusCode: 200,
        trxnId,
        trackingId,
        successData,
        errorData,
        raw: data,
      };
    }

    const errorMessage =
      errorData[0]?.reason ||
      data?.responseResult ||
      data?.ResponseResult ||
      data?.ErrorMessage ||
      data?.errorMessage ||
      data?.message ||
      (status ? `${status}: ${responseResult || ""}`.trim() : null) ||
      `MimSMS Error: StatusCode ${rawStatusCode || resStatus}`;

    return {
      success: false,
      provider: "mimsms",
      recipient: recipientParam,
      recipientCount,
      statusCode: resolvedHttpCode,
      error: errorMessage,
      trxnId,
      successData,
      errorData,
      raw: data,
    };
  };

  /**
   * Internal handler for SMS dispatch via MimSMS V2 API.
   */
  const sendSmsHandler = async (
    message: MimSmsMessage,
  ): Promise<MimSmsSendResult> => {
    try {
      const sender = message.senderId || config.senderId;

      // 1. Resolve flat list of recipient numbers
      let recipients: string[] = [];

      if (Array.isArray(message.recipient)) {
        recipients = message.recipient
          .map((item) => formatBdMobile(item))
          .filter(Boolean) as string[];
      } else if (typeof message.recipient === "string" && message.recipient.includes(",")) {
        recipients = message.recipient
          .split(",")
          .map((item) => formatBdMobile(item.trim()))
          .filter(Boolean) as string[];
      } else if (typeof message.recipient === "string" && message.recipient) {
        const formatted = formatBdMobile(message.recipient);
        if (formatted) recipients.push(formatted);
      }

      if (!recipients.length) {
        return {
          success: false,
          provider: "mimsms",
          statusCode: 400,
          error: "No valid recipient phone number provided.",
        };
      }

      const messageText = message.message || "";
      const currentRecipient = recipients.length === 1 ? recipients[0] : recipients;
      const recipientCount = recipients.length;

      // 2. One-to-Many Broadcast (POST /api/V2/OneToMany) if multiple recipients
      if (recipients.length > 1) {
        const oneToManyUrl = `${baseUrl}/api/V2/OneToMany`;
        const res = await fetch(oneToManyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            apiKey: config.apiKey,
            userName: config.username,
            senderName: sender,
            message: messageText,
            smsData: recipients.map((mobNumber) => ({ mobNumber })),
          }),
        });

        const data: any = await res.json().catch(() => null);
        if (!res.ok && !data) {
          return {
            success: false,
            provider: "mimsms",
            recipient: currentRecipient,
            recipientCount,
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
          };
        }

        return parseResponse(data, res.status, currentRecipient, recipientCount);
      }

      // 3. Single Recipient Flow
      const singleRecipient = recipients[0];

      // 3a. POST /api/V2/SMS (JSON body default)
      const payload = {
        apiKey: config.apiKey,
        userName: config.username,
        senderName: sender,
        transactionType: "T",
        mobileNumber: singleRecipient,
        message: messageText,
      };

      const res = await fetch(`${baseUrl}/api/V2/SMS`, {
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
          provider: "mimsms",
          recipient: singleRecipient,
          recipientCount: 1,
          statusCode: res.status || 500,
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      return parseResponse(data, res.status, singleRecipient, 1);
    } catch (err: any) {
      return {
        success: false,
        provider: "mimsms",
        statusCode: 500,
        error: err.message || "Network error while calling MimSMS API",
      };
    }
  };

  return {
    name: "mimsms",
    defaultSenderId: config.senderId,
    bulkSupport: true,

    send: sendSmsHandler,

    async verify(): Promise<SmsVerifyResult> {
      try {
        const balanceUrl = `${baseUrl}/api/V2/BalanceCheck`;
        const res = await fetch(balanceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            userName: config.username,
            apiKey: config.apiKey,
          }),
        });

        const data: any = await res.json().catch(() => null);

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "mimsms",
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
          };
        }

        const rawStatusCode = String(data?.statusCode || data?.StatusCode || "");
        const status = String(data?.status || data?.Status || "").toLowerCase();

        if (rawStatusCode === "200" || status === "ok" || status === "success") {
          return { success: true, provider: "mimsms", statusCode: 200, raw: data };
        }

        const resolvedCode =
          rawStatusCode && !isNaN(Number(rawStatusCode)) && Number(rawStatusCode) >= 200 && Number(rawStatusCode) < 600
            ? Number(rawStatusCode)
            : res.status >= 200 && res.status < 600
              ? res.status === 200
                ? 401
                : res.status
              : 401;

        return {
          success: false,
          provider: "mimsms",
          statusCode: resolvedCode,
          error:
            data?.responseResult ||
            data?.ResponseResult ||
            data?.status ||
            "MimSMS authentication failed",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "mimsms",
          statusCode: 500,
          error: err.message || "Connection error while verifying MimSMS credentials",
        };
      }
    },

    async getBalance(): Promise<MimSmsBalanceResult> {
      try {
        const balanceUrl = `${baseUrl}/api/V2/BalanceCheck`;
        const res = await fetch(balanceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            userName: config.username,
            apiKey: config.apiKey,
          }),
        });

        const data: any = await res.json().catch(() => null);

        if (!res.ok && !data) {
          return {
            success: false,
            provider: "mimsms",
            statusCode: res.status || 500,
            error: `HTTP ${res.status}: ${res.statusText}`,
          };
        }

        const rawStatusCode = String(data?.statusCode || data?.StatusCode || "");
        const status = String(data?.status || data?.Status || "").toLowerCase();

        if (rawStatusCode === "200" || status === "ok" || status === "success") {
          const balance =
            data?.responseResult ??
            data?.balance ??
            data?.Balance ??
            data?.balanceAmount;

          return {
            success: true,
            provider: "mimsms",
            balance: balance !== undefined ? String(balance) : undefined,
            currency: "BDT",
            statusCode: 200,
            trxnId: data?.trxnId,
            raw: data,
          };
        }

        const resolvedCode =
          rawStatusCode && !isNaN(Number(rawStatusCode)) && Number(rawStatusCode) >= 200 && Number(rawStatusCode) < 600
            ? Number(rawStatusCode)
            : res.status >= 200 && res.status < 600
              ? res.status === 200
                ? 401
                : res.status
              : 400;

        return {
          success: false,
          provider: "mimsms",
          statusCode: resolvedCode,
          error:
            data?.responseResult ||
            data?.status ||
            "Failed to fetch MimSMS balance",
          raw: data,
        };
      } catch (err: any) {
        return {
          success: false,
          provider: "mimsms",
          statusCode: 500,
          error: err.message || "Failed to fetch MimSMS balance",
        };
      }
    },
  };
}
