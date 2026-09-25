import { currencies } from "./currencies";
import type { CurrencyInfo, CountryName, CurrencyCode } from "./types";

export { currencies } from "./currencies";
export * from "./types";
export * from "./format";

/**
 * Retrieves the currency info for a given country name or alias.
 * Matches case-insensitively and ignores leading/trailing whitespace.
 */
export function getCurrencyByCountry(
  name: CountryName | (string & {}),
): CurrencyInfo | null {
  if (!name || typeof name !== "string") {
    return null;
  }
  const key = name.trim().toLowerCase() as CountryName;
  return currencies[key] ?? null;
}

/**
 * Retrieves the currency info for a given currency code.
 */
export function getCurrencyByCode(
  code: CurrencyCode | (string & {}),
): CurrencyInfo | null {
  if (!code || typeof code !== "string") {
    return null;
  }
  const upperCode = code.trim().toUpperCase();
  const list = Object.values(currencies) as readonly CurrencyInfo[];
  return list.find((currency) => currency.code === upperCode) ?? null;
}

/**
 * Checks whether a specific country name exists in the map.
 */
export function hasCountry(countryName: string): boolean {
  if (!countryName || typeof countryName !== "string") {
    return false;
  }
  const key = countryName.trim().toLowerCase();
  return key in currencies;
}
