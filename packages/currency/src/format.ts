import { getCurrencyByCode } from "./index";
import type {
  CurrencyCode,
  CurrencyInfo,
  CurrencyInput,
  FormatCurrencyCustomOptions,
  FormatCurrencyOptions,
  NumericAmount,
} from "./types";

/**
 * Parses a variety of input types (number, string, bigint, Decimal object, null, undefined) safely into a finite number.
 */
export function parseAmount(amount: NumericAmount): number {
  if (amount == null) return 0;
  if (typeof amount === "number") {
    return Number.isFinite(amount) ? amount : 0;
  }
  if (typeof amount === "bigint") {
    return Number(amount);
  }
  if (typeof amount === "object") {
    if (typeof (amount as any).toNumber === "function") {
      const num = (amount as any).toNumber();
      return Number.isFinite(num) ? num : 0;
    }
    const str = amount.toString();
    const parsed = parseFloat(str);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof amount === "string") {
    const trimmed = amount.trim();
    if (!trimmed) return 0;
    // Strip common thousands commas or non-numeric chars leaving signs/digits/decimals
    const sanitized = trimmed.replace(/,/g, "").replace(/[^\d.-]/g, "");
    const parsed = parseFloat(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Resolves a currency identifier (code string or CurrencyInfo object) into standard metadata.
 */
export function resolveCurrencyInfo(currency: CurrencyInput): CurrencyInfo {
  if (
    currency &&
    typeof currency === "object" &&
    "symbol" in currency &&
    "code" in currency
  ) {
    return currency as CurrencyInfo;
  }

  const codeStr =
    (typeof currency === "string" ? currency.trim().toUpperCase() : "") || "";

  if (codeStr) {
    const found = getCurrencyByCode(codeStr as CurrencyCode);
    if (found) {
      return found;
    }
    return {
      code: codeStr as CurrencyCode,
      name: codeStr,
      symbol: codeStr,
    };
  }

  return {
    code: "" as CurrencyCode,
    name: "",
    symbol: "",
  };
}

/**
 * Formats a numeric amount into a localized currency string with full ISO currency support.
 * The `currency` argument is strictly mandatory.
 *
 * @param amount - The numeric value or numeric string to format.
 * @param currency - The currency code (e.g. `"INR"`, `"USD"`, `"BDT"`, `"EUR"`) or custom CurrencyInfo.
 * @param options - Additional formatting options.
 *
 * @example
 * ```typescript
 * formatMoney(100, "INR") // "₹100.00"
 * formatMoney(100, "USD") // "$100.00"
 * formatMoney(100, "EUR") // "€100.00"
 * formatMoney(100, "BDT") // "৳100.00"
 * formatMoney(100, "INR", { trimZeros: true }) // "₹100"
 * formatMoney(1250.5, "USD", { decimals: 2 }) // "$1,250.50"
 * ```
 */
export function formatMoney(
  amount: NumericAmount,
  currency: CurrencyInput,
  options?: FormatCurrencyCustomOptions,
): string;

/**
 * Formats a numeric amount into a localized currency string with full ISO currency support.
 * The `currency` property within `options` is strictly mandatory.
 *
 * @param amount - The numeric value or numeric string to format.
 * @param options - Formatting options containing mandatory `currency`.
 *
 * @example
 * ```typescript
 * formatMoney(100, { currency: "INR" }) // "₹100.00"
 * formatMoney(100, { currency: "INR", trimZeros: true }) // "₹100"
 * ```
 */
export function formatMoney(
  amount: NumericAmount,
  options: FormatCurrencyOptions,
): string;

export function formatMoney(
  amount: NumericAmount,
  currencyOrOptions: CurrencyInput | FormatCurrencyOptions,
  extraOptions?: FormatCurrencyCustomOptions,
): string {
  let options: FormatCurrencyOptions;

  if (
    typeof currencyOrOptions === "string" ||
    (typeof currencyOrOptions === "object" &&
      currencyOrOptions !== null &&
      !("currency" in currencyOrOptions))
  ) {
    options = {
      ...(extraOptions || {}),
      currency: currencyOrOptions as CurrencyInput,
    };
  } else {
    options = (currencyOrOptions || {}) as FormatCurrencyOptions;
  }

  const num = parseAmount(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const currencyInfo = resolveCurrencyInfo(options.currency);
  const locale = options.locale || "en-US";
  const display = options.display || "symbol";
  const signDisplay = options.signDisplay || "standard";

  // Determine decimal fraction digits
  let minDecimals = 2;
  let maxDecimals = 2;

  if (typeof options.decimals === "number") {
    minDecimals = Math.max(0, options.decimals);
    maxDecimals = Math.max(0, options.decimals);
  } else if (options.decimals && typeof options.decimals === "object") {
    minDecimals = options.decimals.min ?? 2;
    maxDecimals = options.decimals.max ?? 2;
  }

  // Format absolute number with locale grouping
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  });

  let formattedNumber = formatter.format(absNum);

  // If trimZeros is true, remove trailing zeros after decimal point
  if (options.trimZeros) {
    formattedNumber = formattedNumber
      .replace(/([.,]\d*?[1-9])0+$/, "$1")
      .replace(/[.,]0+$/, "");
  }

  // Determine symbol / label indicator
  let indicator = currencyInfo.symbol;
  if (display === "code") {
    indicator = currencyInfo.code;
  } else if (display === "name") {
    indicator = currencyInfo.name;
  }

  // Determine positioning
  let position: "prefix" | "suffix" =
    options.symbolPosition === "suffix" ? "suffix" : "prefix";
  if (options.symbolPosition === "auto" || !options.symbolPosition) {
    if (display === "name") {
      position = "suffix";
    } else {
      position = "prefix";
    }
  }

  // Determine spacing
  const hasSpace = options.space ?? (display !== "symbol");
  const spacer = hasSpace ? " " : "";

  // Combine indicator and number
  let combined: string;
  if (position === "suffix") {
    combined = `${formattedNumber}${spacer}${indicator}`;
  } else {
    combined = `${indicator}${spacer}${formattedNumber}`;
  }

  // Apply negative sign formatting
  if (isNegative && signDisplay !== "never") {
    if (signDisplay === "parentheses") {
      return `(${combined})`;
    }
    return `-${combined}`;
  }

  return combined;
}

/**
 * Alias for `formatMoney`.
 */
export const formatCurrency = formatMoney;

/**
 * Creates a reusable currency formatter instance with pre-configured default options.
 * The `currency` argument or property is strictly mandatory.
 *
 * @param currency - The currency code or custom CurrencyInfo.
 * @param defaultOptions - Additional default formatting options.
 *
 * @example
 * ```typescript
 * const formatINR = createCurrencyFormatter("INR");
 * formatINR(100); // "₹100.00"
 * formatINR(100, { trimZeros: true }); // "₹100"
 * ```
 */
export function createCurrencyFormatter(
  currency: CurrencyInput,
  defaultOptions?: FormatCurrencyCustomOptions,
): (
  amount: NumericAmount,
  overrideOptions?: FormatCurrencyCustomOptions,
) => string;

/**
 * Creates a reusable currency formatter instance with pre-configured default options.
 * The `currency` property in `defaultOptions` is strictly mandatory.
 *
 * @param defaultOptions - Formatting options with mandatory `currency`.
 *
 * @example
 * ```typescript
 * const formatUSD = createCurrencyFormatter({ currency: "USD", decimals: 2 });
 * formatUSD(1250); // "$1,250.00"
 * ```
 */
export function createCurrencyFormatter(
  defaultOptions: FormatCurrencyOptions,
): (
  amount: NumericAmount,
  overrideOptions?: FormatCurrencyCustomOptions,
) => string;

export function createCurrencyFormatter(
  currencyOrDefaultOptions: CurrencyInput | FormatCurrencyOptions,
  extraOptions?: FormatCurrencyCustomOptions,
) {
  const baseOptions: FormatCurrencyOptions =
    typeof currencyOrDefaultOptions === "string" ||
    (typeof currencyOrDefaultOptions === "object" &&
      currencyOrDefaultOptions !== null &&
      !("currency" in currencyOrDefaultOptions))
      ? {
          ...(extraOptions || {}),
          currency: currencyOrDefaultOptions as CurrencyInput,
        }
      : (currencyOrDefaultOptions as FormatCurrencyOptions);

  return (
    amount: NumericAmount,
    overrideOptions?: FormatCurrencyCustomOptions,
  ): string => {
    const mergedOptions: FormatCurrencyOptions = {
      ...baseOptions,
      ...(overrideOptions || {}),
    };
    return formatMoney(amount, mergedOptions);
  };
}
