/**
 * Base outbound SMS message payload common to all providers.
 */
export interface BaseSmsMessage {
  /**
   * Recipient phone number (e.g. "017XXXXXXXX", "+88017XXXXXXXX", or "88017XXXXXXXX").
   */
  recipient: string | string[];

  /**
   * The text message body to be dispatched.
   */
  message: string;

  /**
   * Optional custom sender ID or alphanumeric masking name (overriding default provider sender ID).
   */
  senderId?: string;

  /**
   * Optional arbitrary metadata or custom tags.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Standard SMS message payload.
 */
export type SmsMessage = BaseSmsMessage;

/**
 * Supported provider names union.
 */
export type SmsProviderName =
  | "zendsms"
  | "mimsms"
  | "alpha"
  | "bulksmsdhaka"
  | "quicksms"
  | "esms"
  | "sslwireless"
  | "bulksmsbd"
  | "greenweb"
  | "smsnoc"
  | "console";

/**
 * Universal, normalized return type for all SMS dispatch operations.
 */
export interface SmsSendResult<TRaw = unknown> {
  /**
   * Whether the SMS was successfully accepted and dispatched by the provider gateway.
   */
  success: boolean;

  /**
   * Identifier of the SMS provider that processed the dispatch.
   */
  provider: SmsProviderName | string;

  /**
   * Unique message ID or campaign reference assigned by the provider gateway.
   */
  messageId?: string;

  /**
   * Normalized recipient phone number(s) (e.g. "88017XXXXXXXX" or array of numbers).
   */
  recipient?: string | string[];

  /**
   * Total count of recipient numbers targeted in this dispatch.
   */
  recipientCount?: number;

  /**
   * Number of SMS units/parts consumed based on character length and encoding (if reported by provider).
   */
  smsCount?: number;

  /**
   * Unified standard HTTP status code (e.g. 200 for OK, 400 for Bad Request, 401 for Unauthorized, 402 for Payment Required, 429 for Rate Limit, 500 for Internal Error).
   */
  statusCode?: number;

  /**
   * Standardized, human-readable error message if `success` is false.
   */
  error?: string;

  /**
   * Raw untouched response object returned from the provider's API.
   */
  raw?: TRaw;
}

/**
 * Result object returned when querying account SMS balance.
 */
export interface SmsBalanceResult<TRaw = unknown> {
  /**
   * Whether the balance inquiry was successful.
   */
  success: boolean;

  /**
   * Identifier of the SMS provider that processed the inquiry.
   */
  provider?: SmsProviderName | string;

  /**
   * Current SMS balance or credits remaining.
   */
  balance?: string | number;

  /**
   * Currency code if applicable (e.g. "BDT").
   */
  currency?: string;

  /**
   * Standardized HTTP status code (e.g. 200 for OK, 401 for Unauthorized, 403 for Forbidden, 500 for Server Error).
   */
  statusCode?: number;

  /**
   * Human-readable error message if balance inquiry failed.
   */
  error?: string;

  /**
   * Raw untouched response object returned from the provider's API.
   */
  raw?: TRaw;
}

/**
 * Result object returned when verifying provider API credentials.
 */
export interface SmsVerifyResult<TRaw = unknown> {
  /**
   * Whether the credentials and connectivity are valid.
   */
  success: boolean;

  /**
   * Identifier of the SMS provider.
   */
  provider?: SmsProviderName | string;

  /**
   * Standardized HTTP status code (e.g. 200 for OK, 401 for Unauthorized, 403 for Forbidden, 500 for Server Error).
   */
  statusCode?: number;

  /**
   * Human-readable error message if verification failed.
   */
  error?: string;

  /**
   * Raw untouched response object.
   */
  raw?: TRaw;
}

/**
 * Pluggable SMS transport driver interface.
 */
export interface SmsPlugin<
  TMessage extends BaseSmsMessage = BaseSmsMessage,
  TSendResult extends SmsSendResult = SmsSendResult,
> {
  /**
   * Unique identifier of the provider plugin (e.g. "console", "alpha", "zendsms", "greenweb").
   */
  name: string;

  /**
   * Default sender ID or alphanumeric masking name used by this driver.
   */
  defaultSenderId?: string;

  /**
   * Whether this provider plugin supports native multiple recipient bulk broadcasting.
   */
  bulkSupport: boolean;

  /**
   * Sends an SMS message using the provider's protocol.
   */
  send(message: TMessage): Promise<TSendResult>;

  /**
   * Verifies API credentials and connectivity to the provider.
   */
  verify?(): Promise<SmsVerifyResult>;

  /**
   * Checks current SMS account balance/credits from the provider.
   */
  getBalance?(): Promise<SmsBalanceResult>;
}

// Re-export all provider-specific types from their respective plugin files
export * from "./plugins/alpha";
export * from "./plugins/zendsms";
export * from "./plugins/quicksms";
export * from "./plugins/esms";
export * from "./plugins/bulksmsdhaka";
export * from "./plugins/bulksmsbd";
export * from "./plugins/greenweb";
export * from "./plugins/sslwireless";
export * from "./plugins/mimsms";
export * from "./plugins/smsnoc";
export * from "./plugins/console";
