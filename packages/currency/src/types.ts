import { currencies } from "./currencies";

/**
 * @see https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes
 */
export type CountryName = keyof typeof currencies;

/**
 * @see https://en.wikipedia.org/wiki/ISO_4217
 */
export type CurrencyCode = (typeof currencies)[CountryName]["code"];

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
}

/**
 * Supported numeric input types for currency formatting.
 */
export type NumericAmount =
  | number
  | string
  | bigint
  | { toString(): string }
  | { toNumber?(): number }
  | null
  | undefined;

/**
 * Display format for currency label/symbol.
 */
export type CurrencyDisplayMode = "symbol" | "code" | "name";

/**
 * Position of currency indicator relative to the number.
 */
export type CurrencySymbolPosition = "prefix" | "suffix" | "auto";

/**
 * Display mode for negative amounts.
 */
export type SignDisplayMode = "standard" | "parentheses" | "never";

/**
 * Currency input type for formatting - can be a known ISO CurrencyCode,
 * a custom CurrencyInfo object, or any currency code string.
 */
export type CurrencyInput = CurrencyCode | CurrencyInfo | (string & {});

/**
 * Common formatting options without the mandatory currency field.
 */
export interface FormatCurrencyCustomOptions {
  /**
   * Number of decimal places, or `{ min?: number, max?: number }`.
   * @default 2
   */
  decimals?: number | { min?: number; max?: number };

  /**
   * Whether to omit trailing zeros in decimal part (e.g. "100.00" -> "100", "100.50" -> "100.5").
   * @default false
   */
  trimZeros?: boolean;

  /**
   * How to display the currency: symbol ("$"), code ("USD"), or name ("US Dollar").
   * @default "symbol"
   */
  display?: CurrencyDisplayMode;

  /**
   * Position of the currency symbol / code relative to the number.
   * @default "prefix" (or "suffix" when display is "name")
   */
  symbolPosition?: CurrencySymbolPosition;

  /**
   * Whether to insert a space between the symbol/code and the number.
   * @default false for symbols, true for code/name
   */
  space?: boolean;

  /**
   * BCP 47 locale tag used for number grouping (e.g. "en-US", "bn-BD", "en-IN").
   * @default "en-US"
   */
  locale?: string;

  /**
   * Display mode for negative amounts.
   * - "standard": "-₹100.00"
   * - "parentheses": "(₹100.00)"
   * - "never": "₹100.00"
   * @default "standard"
   */
  signDisplay?: SignDisplayMode;
}

/**
 * Configuration options for formatting currency values where currency is mandatory.
 */
export interface FormatCurrencyOptions extends FormatCurrencyCustomOptions {
  /**
   * Currency code (e.g. "USD", "INR", "BDT", "EUR") or custom CurrencyInfo object.
   * Mandatory.
   */
  currency: CurrencyInput;
}
