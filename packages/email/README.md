# @nishchinte/email

Pluggable, provider-agnostic transactional email system for the **Nishchinte** e-commerce platform. Supports SMTP (Gmail, Zoho, SendGrid, Amazon SES, Mailgun, Mailpit), Resend API, and Console development drivers with zero vendor lock-in.

---

## Features

- **Provider Agnostic Contract**: Switch seamlessly between Resend, custom SMTP, or development console without touching application code.
- **Pre-built Transports**:
  - `resendEmail`: High-deliverability REST API integration for Resend.
  - `smtpEmail`: Full-featured Nodemailer transport supporting STARTTLS, SSL/TLS, custom ports, and service profiles.
  - `consoleEmail`: Development logger printing styled email previews directly to terminal output.
- **Diagnostic Connection Checks**: Every plugin implements `verify()` for runtime connection tests and Admin Settings pre-flight diagnostics.
- **Attachments & Inline CID**: Support for buffer attachments, filesystem paths, and embedded inline CID images.
- **Integrated with `@nishchinte/config`**: Register drivers directly in `nishchinte.config.ts`.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/email": "workspace:*"
  }
}
```

---

## Quick Start

### 1. In `nishchinte.config.ts`

```typescript
import { defineConfig } from "@nishchinte/config";
import { resendEmail, smtpEmail, consoleEmail } from "@nishchinte/email";

export default defineConfig({
  // Use Resend in Production
  email: resendEmail({
    apiKey: process.env.RESEND_API_KEY!,
    from: "Nishchinte Store <noreply@nishchinte.com>",
  }),

  // Or use SMTP
  // email: smtpEmail({
  //   host: "smtp.gmail.com",
  //   port: 465,
  //   secure: true,
  //   auth: {
  //     user: process.env.SMTP_USER!,
  //     pass: process.env.SMTP_PASS!,
  //   },
  //   from: "Nishchinte Store <store@gmail.com>",
  // }),

  // Or use Console for local testing
  // email: consoleEmail(),
});
```

### 2. Sending Emails via `createEmailClient`

```typescript
import { createEmailClient, resendEmail } from "@nishchinte/email";

const mailer = createEmailClient(
  resendEmail({
    apiKey: process.env.RESEND_API_KEY!,
    from: "Store <noreply@example.com>",
  })
);

// 1. Verify credentials / connection health
const health = await mailer.verify();
if (!health.success) {
  console.error("Email service unreachable:", health.error);
}

// 2. Dispatch transactional message
const result = await mailer.send({
  to: "customer@example.com",
  subject: "Your Order #1042 has shipped!",
  html: "<h1>Good news!</h1><p>Your package is on the way.</p>",
  text: "Good news! Your package is on the way.",
  attachments: [
    {
      filename: "invoice.pdf",
      path: "./invoices/invoice-1042.pdf",
    },
  ],
});

if (result.success) {
  console.log("Email dispatched with ID:", result.messageId);
}
```

---

## Available Plugins

### 1. `resendEmail(config: ResendConfig)`
Sends emails through the Resend REST API.
```typescript
import { resendEmail } from "@nishchinte/email";

const plugin = resendEmail({
  apiKey: "re_123456789",
  from: "Support <support@domain.com>",
});
```

### 2. `smtpEmail(config: SMTPConfig)`
Sends emails via standard SMTP server using Nodemailer.
```typescript
import { smtpEmail } from "@nishchinte/email";

const plugin = smtpEmail({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "username",
    pass: "password",
  },
  from: "Store <store@domain.com>",
});
```

### 3. `consoleEmail(config?: ConsoleConfig)`
Logs emails to standard output for local development and testing without sending network requests.
```typescript
import { consoleEmail } from "@nishchinte/email";

const plugin = consoleEmail();
```

---

## API Reference

### `EmailMessage` Structure

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `to` | `string \| string[]` | **Yes** | Destination email address(es). |
| `subject` | `string` | **Yes** | Email subject line. |
| `html` | `string` | **Yes** | Rendered HTML email body. |
| `text` | `string` | No | Plaintext fallback body. |
| `from` | `string` | No | Overrides default sender address. |
| `replyTo` | `string` | No | Custom reply-to destination. |
| `cc` | `string \| string[]` | No | Carbon copy recipients. |
| `bcc` | `string \| string[]` | No | Blind carbon copy recipients. |
| `attachments`| `EmailAttachment[]`| No | Array of files, buffers, or inline CIDs. |

---

## Related Packages

- [`@nishchinte/config`](file:///mnt/workspace/Git/ecom/packages/config/README.md) - Platform configuration registering email plugins.
- [`@nishchinte/server`](file:///mnt/workspace/Git/ecom/packages/server/README.md) - Server actions triggering order and auth emails.
