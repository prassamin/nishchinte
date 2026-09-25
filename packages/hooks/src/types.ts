import type { ClientConfig } from "@nishchinte/config/client";
import type {
  NumericAmount,
  FormatCurrencyCustomOptions,
} from "@nishchinte/currency";

export interface UseNishchinteReturn<
  TConfig extends ClientConfig = ClientConfig,
> {
  config: TConfig;
  formatMoney: (
    amount: NumericAmount,
    overrideOptions?: FormatCurrencyCustomOptions,
  ) => string;
}
