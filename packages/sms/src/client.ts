import type { SmsPlugin, SmsSendResult, BaseSmsMessage, SmsMessage, SmsBalanceResult, SmsVerifyResult } from "./types";

/**
 * Unified, provider-agnostic SMS client interface.
 */
export interface SmsClient<TMessage extends BaseSmsMessage = SmsMessage> {
  /**
   * The underlying configured {@link SmsPlugin} driver.
   */
  readonly plugin: SmsPlugin<TMessage>;

  /**
   * Whether the active provider driver natively supports multiple recipient bulk broadcasting.
   */
  readonly bulkSupport: boolean;

  /**
   * Sends an SMS message using the active provider plugin.
   *
   * @param message - The SMS message payload including recipient and content.
   * @returns A promise resolving to {@link SmsSendResult}.
   */
  send(message: TMessage): Promise<SmsSendResult>;

  /**
   * Performs a diagnostic check to verify credentials and API reachability.
   *
   * @returns A promise resolving to {@link SmsVerifyResult}.
   */
  verify(): Promise<SmsVerifyResult>;

  /**
   * Fetches current account credit balance from the SMS provider.
   *
   * @returns A promise resolving to {@link SmsBalanceResult}.
   */
  getBalance(): Promise<SmsBalanceResult>;
}

/**
 * Creates an instance of {@link SmsClient} configured with the specified provider plugin.
 *
 * @param plugin - The initialized {@link SmsPlugin} (e.g. `consoleSms()`, `alphaSms(...)`, or `zendSms(...)`).
 * @returns An {@link SmsClient} instance.
 *
 * @example
 * ```typescript
 * import { createSmsClient, consoleSms } from "@nishchinte/sms";
 *
 * const sms = createSmsClient(consoleSms());
 * console.log("Bulk Support:", sms.bulkSupport);
 * await sms.send({ recipient: "01712345678", message: "Your OTP is 123456" });
 * ```
 */
export function createSmsClient<TMessage extends BaseSmsMessage = SmsMessage>(
  plugin: SmsPlugin<TMessage>,
): SmsClient<TMessage> {
  return {
    plugin,

    get bulkSupport(): boolean {
      return Boolean(plugin.bulkSupport);
    },

    async send(message: TMessage): Promise<SmsSendResult> {
      return plugin.send(message);
    },

    async verify(): Promise<SmsVerifyResult> {
      if (plugin.verify) {
        return plugin.verify();
      }
      return { success: true, provider: plugin.name, statusCode: 200 };
    },

    async getBalance(): Promise<SmsBalanceResult> {
      if (plugin.getBalance) {
        return plugin.getBalance();
      }
      return {
        success: false,
        provider: plugin.name,
        statusCode: 501,
        error: `getBalance is not supported by the "${plugin.name}" plugin.`,
      };
    },
  };
}
