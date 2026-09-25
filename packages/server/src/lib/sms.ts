import { getConfig } from "@nishchinte/config";
import {
  createSmsClient,
  consoleSms,
  type SmsClient,
  type SmsPlugin,
  type SmsMessage,
  type SmsSendResult,
} from "@nishchinte/sms";

export type { SmsClient, SmsPlugin, SmsMessage, SmsSendResult };

let cachedSmsClient: SmsClient | null = null;
let cachedSmsVersion = -1;

/**
 * Resolves or initializes the active SMS client from config.
 */
export function getSmsClient(): SmsClient {
  const config = getConfig();
  const currentVersion = (globalThis as any).__nishchinte_config_version__ || 0;

  if (cachedSmsClient && cachedSmsVersion === currentVersion) {
    return cachedSmsClient;
  }

  cachedSmsVersion = currentVersion;
  if (config?.sms) {
    if ("plugin" in config.sms && typeof (config.sms as any).send === "function") {
      cachedSmsClient = config.sms as SmsClient;
      return cachedSmsClient;
    }
    cachedSmsClient = createSmsClient(config.sms as SmsPlugin);
    return cachedSmsClient;
  }

  cachedSmsClient = createSmsClient(consoleSms());
  return cachedSmsClient;
}

/**
 * Unified SMS facade for server operations.
 */
export const sms = {
  get client(): SmsClient {
    return getSmsClient();
  },
  send: (message: SmsMessage) => getSmsClient().send(message),
  verify: () => getSmsClient().verify(),
  getBalance: () => getSmsClient().getBalance(),
};
