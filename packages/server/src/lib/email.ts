import { getConfig } from "@nishchinte/config";
import {
  createEmailClient,
  consoleEmail,
  type EmailClient,
  type EmailPlugin,
  type EmailMessage,
  type EmailSendResult,
} from "@nishchinte/email";

export type { EmailClient, EmailPlugin, EmailMessage, EmailSendResult };

let cachedEmailClient: EmailClient | null = null;
let cachedEmailVersion = -1;

/**
 * Resolves or initializes the active Email client from config.
 */
export function getEmailClient(): EmailClient {
  const config = getConfig();
  const currentVersion = (globalThis as any).__nishchinte_config_version__ || 0;

  if (cachedEmailClient && cachedEmailVersion === currentVersion) {
    return cachedEmailClient;
  }

  cachedEmailVersion = currentVersion;
  if (config?.email) {
    if ("plugin" in config.email && typeof (config.email as any).send === "function") {
      cachedEmailClient = config.email as EmailClient;
      return cachedEmailClient;
    }
    cachedEmailClient = createEmailClient(config.email as EmailPlugin);
    return cachedEmailClient;
  }

  cachedEmailClient = createEmailClient(consoleEmail());
  return cachedEmailClient;
}

/**
 * Unified Email facade for server operations.
 */
export const email = {
  get client(): EmailClient {
    return getEmailClient();
  },
  send: (message: EmailMessage) => getEmailClient().send(message),
  verify: () => getEmailClient().verify(),
};
