/**
 * Normalizes a Bangladeshi phone number into the standard 13-digit E.164 format (without +)
 * expected by Bangladeshi SMS gateways (e.g. "8801712345678").
 *
 * Handles inputs like:
 * - "01712345678" -> "8801712345678"
 * - "+8801712345678" -> "8801712345678"
 * - "8801712345678" -> "8801712345678"
 * - "1712345678" -> "8801712345678"
 *
 * @param phone - Raw phone number string.
 * @returns Cleaned 13-digit number.
 */
export function formatBdMobile(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("8801") && clean.length === 13) return clean;
  if (clean.startsWith("01") && clean.length === 11) return `88${clean}`;
  if (clean.startsWith("1") && clean.length === 10) return `880${clean}`;
  return clean;
}

/**
 * Normalizes single or comma-separated recipients into an array of cleaned phone numbers.
 *
 * @param recipient - Recipient string or array of strings.
 * @returns Array of sanitized phone numbers.
 */
export function normalizeRecipients(recipient: string | string[]): string[] {
  const list = Array.isArray(recipient) ? recipient : recipient.split(",");
  return list
    .map((num) => formatBdMobile(num.trim()))
    .filter((num) => num.length > 0);
}
