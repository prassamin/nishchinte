import crypto from "node:crypto";

export interface SignatureHeader {
  timestamp: number;
  signature: string;
}

/**
 * Signs a webhook payload string using HMAC SHA-256 with a timestamp prefix.
 */
export function signWebhookPayload(payload: string, secret = "default_secret", timestamp = Date.now()): string {
  const dataToSign = `${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", secret || "default_secret").update(dataToSign).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verifies an incoming webhook HMAC SHA-256 signature header against a raw payload string.
 */
export function verifyWebhookSignature(
  rawPayload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!signatureHeader || !rawPayload || !secret) return false;

  const parts = signatureHeader.split(",");
  let timestampStr: string | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestampStr = value;
    if (key === "v1") signature = value;
  }

  if (!timestampStr || !signature) return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  if (Math.abs(now - timestamp) > toleranceSeconds * 1000) {
    return false; // Timestamp outside allowed tolerance
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawPayload}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"));
  } catch {
    return false;
  }
}
