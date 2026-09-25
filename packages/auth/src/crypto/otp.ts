import crypto from "node:crypto";

/**
 * Generates a cryptographically secure numeric OTP of the specified length.
 *
 * @param length - Number of digits (default: 6)
 * @returns Numeric OTP string (e.g. "492015")
 */
export function generateNumericOtp(length = 6): string {
  if (length <= 0) return "";
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const num = crypto.randomInt(min, max + 1);
  return num.toString();
}

/**
 * Generates a cryptographically secure random alphanumeric string / token.
 *
 * @param byteLength - Bytes of entropy (default: 32)
 * @returns Hex-encoded token
 */
export function generateRandomToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Generates a cryptographically secure random hex salt.
 *
 * @param byteLength - Salt byte length (default: 16)
 * @returns Hex-encoded salt
 */
export function generateSalt(byteLength = 16): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Computes a SHA-256 hash of an OTP code combined with its unique challenge salt.
 *
 * @param code - Raw numeric OTP code
 * @param salt - Unique challenge salt
 * @returns Hex-encoded SHA-256 hash
 */
export function hashOtpCode(code: string, salt: string): string {
  return crypto
    .createHash("sha256")
    .update(`${code.trim()}:${salt}`)
    .digest("hex");
}

/**
 * Constant-time comparison of a submitted OTP against the stored salted hash.
 *
 * @param code - Submitted OTP code
 * @param salt - Challenge salt
 * @param expectedHash - Stored codeHash
 * @returns True if OTP matches
 */
export function verifyOtpCode(
  code: string,
  salt: string,
  expectedHash: string,
): boolean {
  if (!code || !salt || !expectedHash) return false;
  const computed = hashOtpCode(code, salt);
  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Hashes an opaque token using SHA-256 for secure database storage.
 *
 * @param token - Raw token string
 * @returns Hex-encoded SHA-256 hash
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

