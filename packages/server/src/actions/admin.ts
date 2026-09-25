"use server";

import { auth } from "@nishchinte/auth/server";
import type {
  UpdateUserAttributes,
  InternalUserRole,
  TeamMember,
  ListUsersResult,
  AuthActionResult,
  AdminSessionPayload,
} from "@nishchinte/auth";
import { safeRevalidate } from "./utils";
import { redirect } from "next/navigation";

/**
 * Server Action: First-time store setup wizard (creates the OWNER admin account).
 */
export async function setupInitialAdminAction(data: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}): Promise<AuthActionResult<AdminSessionPayload>> {
  return auth.admin.setupInitialAdmin(data);
}

/**
 * Server Action: Lists all internal team members (Admins and Staff).
 */
export async function getTeamMembersAction(options?: {
  role?: InternalUserRole;
  search?: string;
}): Promise<ListUsersResult | { ok: false; error: string }> {
  return auth.admin.listUsers(options);
}

/**
 * Server Action: Checks an admin user set or not
 */
export async function hasAdminUserAction(): Promise<boolean> {
  return auth.admin.hasAdmin();
}

/**
 * Server Action: Creates a new team member directly.
 */
export async function createTeamMemberAction(data: {
  name: string;
  email: string;
  password?: string;
  role: "ADMIN" | "STAFF";
  phone?: string;
  avatarUrl?: string;
  permissions?: string[];
}): Promise<AuthActionResult<TeamMember>> {
  const result = await auth.admin.createUser({
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role as InternalUserRole,
    phone: data.phone,
    avatarUrl: data.avatarUrl,
    permissions: data.permissions,
  });

  if (result.ok) {
    await safeRevalidate("/admin/settings/team");
  }

  return result;
}

/**
 * Server Action: Unified method to update any attribute of a team member (role, status, password, profile).
 */
export async function updateTeamMemberAction(
  id: string,
  attributes: UpdateUserAttributes,
): Promise<AuthActionResult<TeamMember>> {
  const result = await auth.admin.updateUser(id, attributes);
  if (result.ok) {
    await safeRevalidate("/admin/settings/team");
  }
  return result;
}

/**
 * Server Action: Authenticates an admin user with email and password.
 */
export async function signInAdminAction(data: {
  email: string;
  password: string;
}): Promise<AuthActionResult<AdminSessionPayload>> {
  return auth.admin.signIn(data);
}

/**
 * Server Action: Signs out active admin user and clears session cookie.
 */
export async function signOutAdminAction(): Promise<void> {
  await auth.admin.signOut();
  return redirect("/");
}

/**
 * Server Action: Deletes or safely soft-deactivates a team member.
 */
export async function deleteTeamMemberAction(
  id: string,
): Promise<
  | { ok: true; action: "deleted" | "deactivated"; message: string }
  | { ok: false; error: string }
> {
  const result = await auth.admin.deleteUser(id);
  if (result.ok) {
    await safeRevalidate("/admin/settings/team");
  }
  return result;
}
