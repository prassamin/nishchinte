"use client";

import { useMemo } from "react";
import { useConfig } from "@nishchinte/config/client";
import type { ClientConfig } from "@nishchinte/config/client";
import { createCurrencyFormatter } from "@nishchinte/currency";
import type { UseNishchinteReturn } from "./types";

/**
 * Main application hook for accessing sanitized client config and utilities (such as currency formatting).
 * Must be used within a `<ConfigProvider>`.
 */
export const useNishchinte = <
  TConfig extends ClientConfig = ClientConfig,
>(): UseNishchinteReturn<TConfig> => {
  const config = useConfig<TConfig>();

  const formatMoney = useMemo(() => {
    return createCurrencyFormatter(config.currency);
  }, [config.currency]);

  return {
    config,
    formatMoney,
  };
};
