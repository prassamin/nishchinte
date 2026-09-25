export { app, createApp } from "./app";
export { actions } from "./actions";

export { storage, getStorageClient } from "./lib/storage";
export type { StorageClient, StoragePlugin } from "./lib/storage";

export { sms, getSmsClient } from "./lib/sms";
export type { SmsClient, SmsPlugin, SmsMessage, SmsSendResult } from "./lib/sms";

export { email, getEmailClient } from "./lib/email";
export type { EmailClient, EmailPlugin, EmailMessage, EmailSendResult } from "./lib/email";

export {
  auth,
  createRequestAuth,
  adminAuth,
  customerAuth,
  customerAddresses,
  customerIdentities,
} from "@nishchinte/auth/server";
export type { RequestBoundAuth } from "@nishchinte/auth/server";
export type {
  AdminSessionPayload,
  CustomerSessionPayload,
  TeamMember,
  CreateUserAttributes,
  UpdateUserAttributes,
  ListUsersResult,
  CustomerUser,
  CustomerAddressItem,
  CustomerAddressInput,
  UpdateCustomerAttributes,
  CustomerAuthMode,
  AuthTokens,
  SignOutOptions,
  User,
  Session,
  CustomerSession,
  UserIdentity,
  UserAppMetadata,
  UserMetadata,
  AuthResponse,
  AuthError,
} from "@nishchinte/auth";