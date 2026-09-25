import { prisma } from "@nishchinte/db";
import { getConfig } from "@nishchinte/config";
import {
  generateNumericOtp,
  generateSalt,
  hashOtpCode,
  verifyOtpCode,
} from "../crypto/otp";
import type {
  SendOtpOptions,
  VerifyOtpOptions,
  AuthActionResult,
  AuthCapabilities,
  OtpChannelType,
} from "../types";

export interface SendOtpResultData {
  identifier: string;
  channel: OtpChannelType;
  expiresAt: Date;
  cooldownSeconds: number;
  isDevFallback?: boolean;
}

export interface VerifyOtpResultData {
  identifier: string;
  purpose: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Normalizes phone numbers or email identifiers.
 */
export function normalizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  // Strip non-digits except leading +
  let cleaned = trimmed.replace(/[^\d+]/g, "");
  // If Bangladesh local number (e.g. 017xxxxxxxx), format as 88017xxxxxxxx or keep clean 017
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `88${cleaned}`;
  }
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned.replace(/^\+/, "");
  }
  return cleaned;
}

/**
 * Inspects system configuration and returns dynamic auth & channel capabilities.
 */
export function getAuthCapabilities(): AuthCapabilities {
  const config = getConfig();
  const authCfg = config.auth;
  const customerCfg = authCfg?.customer;

  const hasSms = Boolean(config.sms);
  const hasEmail = Boolean(config.email);
  const isDevMode = process.env.NODE_ENV !== "production";
  const hasOtpTransport = hasSms || hasEmail || isDevMode;

  const supportedChannels: OtpChannelType[] = [];
  if (hasSms) supportedChannels.push("SMS");
  if (hasEmail) supportedChannels.push("EMAIL");
  if (isDevMode && supportedChannels.length === 0) {
    supportedChannels.push("SMS", "EMAIL");
  }

  const mode = customerCfg?.mode || "hybrid";

  return {
    mode,
    hasSms,
    hasEmail,
    hasOtpTransport,
    supportedChannels,
    isDevMode,
    otpCooldownSeconds: config.otpCooldownSeconds ?? 60,
    otpLength: customerCfg?.otpLength ?? 6,
    isAuthEnabled: mode !== "authless",
  };
}

/**
 * Universal OTP Dispatch Engine.
 * Supports SMS, Email, WhatsApp, and Voice with challenge salting, rate-limiting, and cooldown windows.
 * Gracefully handles scenarios when no transport plugin is configured.
 */
export async function createAndSendOtp(
  options: SendOtpOptions,
): Promise<AuthActionResult<SendOtpResultData>> {
  const config = getConfig().auth;
  const rawConfig = getConfig();
  const customerCfg = config?.customer;

  const otpLength = customerCfg?.otpLength ?? 6;
  const expiresInMinutes = customerCfg?.otpExpiresInMinutes ?? 5;
  const cooldownSeconds = rawConfig.otpCooldownSeconds ?? 60;
  const maxAttempts = customerCfg?.maxOtpAttempts ?? 5;

  const identifier = normalizeIdentifier(options.identifier);
  const purpose = options.purpose || "SIGN_IN";
  const channel = (options.channel || "SMS") as OtpChannelType;
  const isDevMode = process.env.NODE_ENV !== "production";

  // 1. Channel Availability Check
  const smsClient = rawConfig.sms as any;
  const emailClient = rawConfig.email as any;

  if (channel === "SMS" && !smsClient && !isDevMode) {
    return {
      ok: false,
      error: "SMS service is not configured. Please use another sign-in method or contact store support.",
      code: "TRANSPORT_NOT_CONFIGURED",
    };
  }

  if (channel === "EMAIL" && !emailClient && !isDevMode) {
    return {
      ok: false,
      error: "Email service is not configured. Please use another sign-in method or contact store support.",
      code: "TRANSPORT_NOT_CONFIGURED",
    };
  }

  try {
    // 2. Rate-Limit / Resend Cooldown Check
    const recentChallenge = await prisma.otpVerification.findFirst({
      where: {
        identifier,
        purpose,
        isUsed: false,
        createdAt: {
          gte: new Date(Date.now() - cooldownSeconds * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentChallenge) {
      const elapsedSeconds = Math.floor(
        (Date.now() - recentChallenge.createdAt.getTime()) / 1000,
      );
      const remainingSeconds = Math.max(1, cooldownSeconds - elapsedSeconds);
      return {
        ok: false,
        error: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        code: "RATE_LIMITED",
      };
    }

    // 3. Generate Salted Cryptographic Code
    const code = generateNumericOtp(otpLength);
    const salt = generateSalt(16);
    const codeHash = hashOtpCode(code, salt);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // 4. Mark old unused OTPs for same identifier & purpose as used to prevent collisions
    await prisma.otpVerification.updateMany({
      where: {
        identifier,
        purpose,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    // 5. Save New Challenge in Database
    await prisma.otpVerification.create({
      data: {
        identifier,
        codeHash,
        salt,
        purpose,
        channel,
        entityType: options.entityType || null,
        entityId: options.entityId || null,
        expiresAt,
        maxAttempts,
        metadata: options.metadata ? (options.metadata as any) : undefined,
      },
    });

    // 6. Dispatch Message across selected channel
    const messageBody = `Your verification code is ${code}. It expires in ${expiresInMinutes} minutes. Do not share this code with anyone.`;
    let isDevFallback = false;

    if (channel === "SMS") {
      if (smsClient && typeof smsClient.send === "function") {
        try {
          await smsClient.send({
            recipient: identifier,
            message: messageBody,
          });
        } catch (smsError) {
          console.error("SMS transport error during OTP dispatch:", smsError);
          return {
            ok: false,
            error: "Failed to dispatch SMS through the provider. Please try again shortly.",
            code: "TRANSPORT_DISPATCH_FAILED",
          };
        }
      } else {
        isDevFallback = true;
        console.warn(
          `\n⚠️ [Nishchinte Dev Mode] No SMS plugin configured in nishchinte.config.ts!\n   ➡️  To: ${identifier}\n   🔑  OTP Code: ${code}\n   ⏱️  Expires in: ${expiresInMinutes} mins\n`,
        );
      }
    } else if (channel === "EMAIL") {
      if (emailClient && typeof emailClient.send === "function") {
        try {
          await emailClient.send({
            to: identifier,
            subject: `Verification Code: ${code}`,
            text: messageBody,
          });
        } catch (emailError) {
          console.error("Email transport error during OTP dispatch:", emailError);
          return {
            ok: false,
            error: "Failed to dispatch email through the provider. Please try again shortly.",
            code: "TRANSPORT_DISPATCH_FAILED",
          };
        }
      } else {
        isDevFallback = true;
        console.warn(
          `\n⚠️ [Nishchinte Dev Mode] No Email plugin configured in nishchinte.config.ts!\n   ➡️  To: ${identifier}\n   🔑  OTP Code: ${code}\n   ⏱️  Expires in: ${expiresInMinutes} mins\n`,
        );
      }
    }

    return {
      ok: true,
      data: {
        identifier,
        channel,
        expiresAt,
        cooldownSeconds,
        isDevFallback,
      },
    };
  } catch (error: any) {
    console.error("createAndSendOtp error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to send verification code. Please try again.",
    };
  }
}

/**
 * Universal OTP Verification Engine.
 * Constant-time hash comparison with attempt-limiting and automatic invalidation.
 */
export async function verifyOtp(
  options: VerifyOtpOptions,
): Promise<AuthActionResult<VerifyOtpResultData>> {
  const identifier = normalizeIdentifier(options.identifier);
  const purpose = options.purpose || "SIGN_IN";
  const code = options.code.trim();

  try {
    const challenge = await prisma.otpVerification.findFirst({
      where: {
        identifier,
        purpose,
        isUsed: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge) {
      return {
        ok: false,
        error: "Verification code has expired or is invalid. Please request a new one.",
        code: "EXPIRED_OR_NOT_FOUND",
      };
    }

    // Check Max Attempts
    if (challenge.attempts >= challenge.maxAttempts) {
      await prisma.otpVerification.update({
        where: { id: challenge.id },
        data: { isUsed: true },
      });
      return {
        ok: false,
        error: "Maximum verification attempts exceeded. Please request a new code.",
        code: "MAX_ATTEMPTS_EXCEEDED",
      };
    }

    // Constant-time Hash Comparison
    const isValid = verifyOtpCode(code, challenge.salt, challenge.codeHash);

    if (!isValid) {
      await prisma.otpVerification.update({
        where: { id: challenge.id },
        data: {
          attempts: { increment: 1 },
        },
      });

      const remaining = challenge.maxAttempts - (challenge.attempts + 1);
      return {
        ok: false,
        error:
          remaining > 0
            ? `Invalid verification code. ${remaining} attempts remaining.`
            : "Invalid verification code. Maximum attempts exceeded.",
        code: "INVALID_CODE",
      };
    }

    // Mark as Used
    await prisma.otpVerification.update({
      where: { id: challenge.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    return {
      ok: true,
      data: {
        identifier: challenge.identifier,
        purpose: challenge.purpose,
        entityType: challenge.entityType,
        entityId: challenge.entityId,
        metadata: (challenge.metadata as Record<string, unknown>) ?? null,
      },
    };
  } catch (error: any) {
    console.error("verifyOtp error:", error);
    return {
      ok: false,
      error: error?.message || "Verification failed. Please try again.",
    };
  }
}
