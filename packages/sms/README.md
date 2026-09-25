# @nishchinte/sms

Comprehensive, multi-gateway SMS messaging suite tailored for Bangladesh and international telco operators in the **Nishchinte** e-commerce platform. Features normalized phone number sanitization, bulk broadcasting, balance checks, connection health verification, and instant fallback.

---

## Features

- **11 Integrated Gateways**:
  - `zendSms` (ZendSMS)
  - `mimSms` (MimSMS)
  - `alphaSms` (Alpha Net SMS)
  - `sslWirelessSms` (SSL Wireless Push API)
  - `greenwebSms` (Greenweb BD)
  - `bulkSmsBdSms` (BulkSMSBD)
  - `bulkSmsDhakaSms` (Bulk SMS Dhaka)
  - `esmsSms` (eSMS)
  - `quickSms` (QuickSMS)
  - `smsNocSms` (SMS NOC)
  - `consoleSms` (Local development mock)
- **Automatic BD Mobile Normalization (`formatBdMobile`)**: Converts `017...`, `+88017...`, or `88017...` into standardized operator-compliant numbers (`88017XXXXXXXX`).
- **Bulk Messaging Support**: Smart bulk dispatch for marketing and transactional alerts with provider-level recipient batching.
- **Account Balance Queries**: Query live SMS credits and balance via `sms.getBalance()`.
- **Pre-flight Health Diagnostics**: Validate API keys and masking sender IDs using `sms.verify()`.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/sms": "workspace:*"
  }
}
```

---

## Quick Start

### 1. Configure in `nishchinte.config.ts`

```typescript
import { defineConfig } from "@nishchinte/config";
import { zendSms, consoleSms } from "@nishchinte/sms";

export default defineConfig({
  // Use ZendSMS in Production
  sms: zendSms({
    apiKey: process.env.ZEND_SMS_API_KEY!,
    senderId: process.env.ZEND_SMS_SENDER_ID!,
  }),

  // Or use Mock Console in Development
  // sms: consoleSms(),
});
```

### 2. Sending Messages via `createSmsClient`

```typescript
import { createSmsClient, zendSms, formatBdMobile } from "@nishchinte/sms";

const sms = createSmsClient(
  zendSms({
    apiKey: process.env.ZEND_SMS_API_KEY!,
    senderId: "NISHCHINTE",
  })
);

// 1. Validate connection & balance
const balance = await sms.getBalance();
console.log(`Current Balance: ${balance.balance} ${balance.currency || "Credits"}`);

// 2. Format recipient number safely
const recipient = formatBdMobile("01712345678"); // "8801712345678"

// 3. Dispatch SMS
const result = await sms.send({
  recipient,
  message: "Your Nishchinte verification code is 849201. Valid for 5 minutes.",
});

if (result.success) {
  console.log("SMS sent successfully, messageId:", result.messageId);
} else {
  console.error("SMS failed:", result.error);
}
```

---

## Supported Gateways

| Driver | Function | Features |
| :--- | :--- | :--- |
| **ZendSMS** | `zendSms(config)` | Single & Bulk dispatch, balance checks, masking IDs. |
| **MimSMS** | `mimSms(config)` | Transactional & dynamic routing, balance inquiry. |
| **Alpha SMS** | `alphaSms(config)` | Alpha Net SMS gateway integration. |
| **SSL Wireless** | `sslWirelessSms(config)` | SSL Wireless Corporate Push SMS API. |
| **Greenweb** | `greenwebSms(config)` | Greenweb BD Token-based dispatch. |
| **BulkSMS BD** | `bulkSmsBdSms(config)` | BulkSMSBD single and campaign endpoints. |
| **Bulk SMS Dhaka** | `bulkSmsDhakaSms(config)` | Bulk SMS Dhaka HTTP API. |
| **eSMS** | `esmsSms(config)` | eSMS gateway dispatch. |
| **QuickSMS** | `quickSms(config)` | QuickSMS REST API. |
| **SMS NOC** | `smsNocSms(config)` | SMS NOC international & local routes. |
| **Console Mock** | `consoleSms()` | Terminal logger for zero-cost offline testing. |

---

## Utilities Reference

### `formatBdMobile(input: string): string | null`
Sanitizes messy phone input into the standard 13-digit Bangladeshi MSISDN format (`8801XXXXXXXXX`).

```typescript
import { formatBdMobile } from "@nishchinte/sms";

formatBdMobile("01711223344");     // "8801711223344"
formatBdMobile("+8801811223344");  // "8801811223344"
formatBdMobile("8801911223344");   // "8801911223344"
formatBdMobile("invalid-phone");   // null
```

---

## API Reference

### `SmsClient` Interface

| Method | Signature | Description |
| :--- | :--- | :--- |
| `send(message)` | `(message: SmsMessage) => Promise<SmsSendResult>` | Sends a single or bulk SMS message. |
| `verify()` | `() => Promise<SmsVerifyResult>` | Validates API credentials and gateway reachability. |
| `getBalance()` | `() => Promise<SmsBalanceResult>` | Fetches remaining account balance or message units. |
| `bulkSupport` | `boolean` | Indicates if the configured provider supports array recipients. |

---

## Related Packages

- [`@nishchinte/config`](file:///mnt/workspace/Git/ecom/packages/config/README.md) - Registers SMS gateway drivers in root config.
- [`@nishchinte/auth`](file:///mnt/workspace/Git/ecom/packages/auth/README.md) - Generates OTP codes sent via `@nishchinte/sms`.
- [`@nishchinte/server`](file:///mnt/workspace/Git/ecom/packages/server/README.md) - Server action triggers for OTP and order notifications.
