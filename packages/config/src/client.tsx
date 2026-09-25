"use client";

import { createContext, useContext } from "react";
import type { ClientConfig, ConfigProviderProps } from "./types";

export type * from "./types";

export const ConfigContext = createContext<ClientConfig>({} as ClientConfig);

/**
 * React Context Provider for the Nishchinte client configuration.
 *
 * Wraps your application tree to provide client components with safe,
 * read-only access to client-safe configuration settings.
 */
export function ConfigProvider<T extends ClientConfig = ClientConfig>({
  value,
  children,
}: ConfigProviderProps<T>) {
  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

/**
 * React hook to access the sanitized Nishchinte client configuration.
 *
 * @returns The active {@link ClientConfig} with full TypeScript inference.
 */
export function useConfig<T extends ClientConfig = ClientConfig>(): T {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context as T;
}
