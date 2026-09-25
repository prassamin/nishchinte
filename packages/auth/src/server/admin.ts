import { prisma } from "@nishchinte/db";
import { verifyJwt } from "../crypto/jwt";
import { hashPassword, verifyPassword } from "../crypto/password";
import {
  createAdminSession,
  getAdminUser,
  getAdminSession,
  getAdminSessionFromToken,
  requireAdminUser,
  requireAdminSession,
  destroyAdminSession,
} from "../session/admin";
import type {
  AdminSessionPayload,
  AdminSession,
  AuthActionResult,
  SignInInput,
  SignUpInput,
  CreateUserAttributes,
  UpdateUserAttributes,
  TeamMember,
  ListUsersResult,
  InternalUserRole,
  SignOutOptions,
} from "../types";
import { signInSchema, signUpSchema } from "../types";
import { getAvatarSync } from "@nishchinte/utils";
import { getConfig } from "@nishchinte/config";

/**
 * Admin & Staff Operations (RBAC & Platform Management)
 */
export const adminAuth = {
  getUser: async (): Promise<AdminSessionPayload | null> => {
    return getAdminUser();
  },

  getSession: async (): Promise<AdminSession | null> => {
    return getAdminSession();
  },

  getUserFromToken: async (
    token: string,
  ): Promise<AdminSessionPayload | null> => {
    return getAdminSessionFromToken(token);
  },

  getSessionFromToken: async (
    token: string,
  ): Promise<AdminSession | null> => {
    const user = await getAdminSessionFromToken(token);
    if (!user) return null;
    const config = getConfig().auth;
    const accessMaxAge = config?.session?.accessTokenMaxAge ?? 900;
    const decoded = await verifyJwt<{ exp?: number }>(token, {
      audience: config?.admin?.audience,
    });
    const expiresAt = decoded?.exp ?? (Math.floor(Date.now() / 1000) + accessMaxAge);
    const expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));

    return {
      accessToken: token,
      expiresIn,
      expiresAt,
      tokenType: "Bearer" as const,
      user,
    };
  },

  requireUser: async (): Promise<AdminSessionPayload> => {
    return requireAdminUser();
  },

  requireSession: async (): Promise<AdminSession> => {
    return requireAdminSession();
  },

  hasAdmin: async (): Promise<boolean> => {
    try {
      const count = await prisma.internalUser.count();
      return count > 0;
    } catch (error) {
      console.error("adminAuth.hasAdmin error:", error);
      return false;
    }
  },

  signIn: async (
    input: SignInInput,
  ): Promise<AuthActionResult<AdminSessionPayload>> => {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const { email, password } = parsed.data;

    try {
      const user = await prisma.internalUser.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user || !user.isActive) {
        return {
          ok: false,
          error: "Invalid email or password. Please try again.",
        };
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return {
          ok: false,
          error: "Invalid email or password. Please try again.",
        };
      }

      await prisma.internalUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const { session } = await createAdminSession({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl || getAvatarSync(user),
        permissions: (user.permissions as string[]) ?? [],
      });

      return { ok: true, data: session, redirectTo: "/admin" };
    } catch (error) {
      console.error("adminAuth.signIn error:", error);
      return {
        ok: false,
        error: "An error occurred during sign in. Please try again.",
      };
    }
  },

  setupInitialAdmin: async (
    input: SignUpInput & { phone?: string },
  ): Promise<AuthActionResult<AdminSessionPayload>> => {
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    try {
      const existingCount = await prisma.internalUser.count();
      if (existingCount > 0) {
        return {
          ok: false,
          error: "Store is already configured. Please sign in.",
        };
      }

      const { fullName, email, password } = parsed.data;
      const hashedPassword = await hashPassword(password);

      const user = await prisma.internalUser.create({
        data: {
          name: fullName.trim(),
          email: email.toLowerCase().trim(),
          phone: input.phone?.trim() ?? null,
          passwordHash: hashedPassword,
          role: "OWNER",
          isActive: true,
        },
      });

      const { session } = await createAdminSession({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl || getAvatarSync(user),
        permissions: [],
      });

      return { ok: true, data: session, redirectTo: "/admin" };
    } catch (error) {
      console.error("adminAuth.setupInitialAdmin error:", error);
      return {
        ok: false,
        error: "Failed to create admin account. Please try again.",
      };
    }
  },

  signOut: async (options?: SignOutOptions): Promise<void> => {
    await destroyAdminSession(options);
  },

  listUsers: async (options?: {
    role?: InternalUserRole;
    search?: string;
  }): Promise<ListUsersResult | { ok: false; error: string }> => {
    try {
      const currentAdmin = await getAdminSession();
      const where: any = {};
      if (options?.role) {
        where.role = options.role;
      }
      if (options?.search) {
        where.OR = [
          { name: { contains: options.search } },
          { email: { contains: options.search } },
        ];
      }

      const users = await prisma.internalUser.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          isActive: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          permissions: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      const members: TeamMember[] = users.map((u) => ({
        ...u,
        role: u.role as InternalUserRole,
        permissions: (u.permissions as string[]) ?? [],
        avatarUrl: u.avatarUrl || getAvatarSync(u),
      }));

      return {
        ok: true,
        members,
        users: members,
        currentUser: currentAdmin
          ? {
              id: currentAdmin.user.id,
              name: currentAdmin.user.name,
              email: currentAdmin.user.email,
              role: currentAdmin.user.role,
            }
          : undefined,
      };
    } catch (error: any) {
      console.error("adminAuth.listUsers error:", error);
      return {
        ok: false,
        error: error?.message || "Failed to load users",
      };
    }
  },

  getUserById: async (id: string): Promise<AuthActionResult<TeamMember>> => {
    try {
      await requireAdminSession();
      const user = await prisma.internalUser.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          isActive: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          permissions: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      if (!user) {
        return { ok: false, error: "User not found" };
      }

      return {
        ok: true,
        data: {
          ...user,
          role: user.role as InternalUserRole,
          permissions: (user.permissions as string[]) ?? [],
          avatarUrl: user.avatarUrl || getAvatarSync(user),
        },
      };
    } catch (error: any) {
      console.error("adminAuth.getUserById error:", error);
      return { ok: false, error: error?.message || "Failed to get user" };
    }
  },

  createUser: async (
    attributes: CreateUserAttributes,
  ): Promise<AuthActionResult<TeamMember>> => {
    try {
      const { user: currentAdmin } = await requireAdminSession();

      if (currentAdmin.role === "STAFF") {
        return {
          ok: false,
          error: "Staff members do not have permission to add team members",
        };
      }

      if (
        currentAdmin.role === "ADMIN" &&
        attributes.role &&
        attributes.role !== "STAFF"
      ) {
        return {
          ok: false,
          error: "Administrators cannot add another Administrator or Owner",
        };
      }

      const email = attributes.email.toLowerCase().trim();
      const existing = await prisma.internalUser.findUnique({
        where: { email },
      });

      if (existing) {
        return {
          ok: false,
          error: "A user with this email already exists",
        };
      }

      const rawPassword = attributes.password || "password";
      const passwordHash = await hashPassword(rawPassword);

      const created = await prisma.internalUser.create({
        data: {
          name: attributes.name.trim(),
          email,
          phone: attributes.phone?.trim() ?? null,
          avatarUrl: attributes.avatarUrl ?? null,
          passwordHash,
          role: (attributes.role || "STAFF") as any,
          permissions: attributes.permissions ?? [],
          isActive: attributes.isActive ?? true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          permissions: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      return {
        ok: true,
        data: {
          ...created,
          role: created.role as InternalUserRole,
          permissions: (created.permissions as string[]) ?? [],
          avatarUrl: created.avatarUrl || getAvatarSync(created),
        },
      };
    } catch (error: any) {
      console.error("adminAuth.createUser error:", error);
      return {
        ok: false,
        error: error?.message || "Failed to create user",
      };
    }
  },

  updateUser: async (
    id: string,
    attributes: UpdateUserAttributes,
  ): Promise<AuthActionResult<TeamMember>> => {
    try {
      const { user: currentAdmin } = await requireAdminSession();
      const targetUser = await prisma.internalUser.findUnique({
        where: { id },
      });

      if (!targetUser) {
        return { ok: false, error: "Team member not found" };
      }

      if (
        attributes.role !== undefined &&
        attributes.role !== targetUser.role
      ) {
        if (currentAdmin.role === "STAFF") {
          return {
            ok: false,
            error: "Staff members do not have permission to update roles",
          };
        }
        if (
          targetUser.role === "OWNER" &&
          currentAdmin.id === targetUser.id
        ) {
          return {
            ok: false,
            error: "Owner role cannot be changed directly",
          };
        }
        if (currentAdmin.role === "ADMIN") {
          if (targetUser.role === "OWNER" || targetUser.role === "ADMIN") {
            return {
              ok: false,
              error:
                "Administrators cannot change roles of other Administrators or Owners",
            };
          }
          if (attributes.role !== "STAFF") {
            return {
              ok: false,
              error:
                "Administrators cannot promote members to Administrator or Owner",
            };
          }
        }
        if (attributes.role === "OWNER" && currentAdmin.role !== "OWNER") {
          return { ok: false, error: "Cannot assign Owner role" };
        }
      }

      if (
        attributes.isActive !== undefined &&
        attributes.isActive !== targetUser.isActive
      ) {
        if (currentAdmin.id === id) {
          return {
            ok: false,
            error: "You cannot change your own account status",
          };
        }
        if (currentAdmin.role === "STAFF") {
          return {
            ok: false,
            error:
              "Staff members do not have permission to modify team members",
          };
        }
        if (targetUser.role === "OWNER") {
          return {
            ok: false,
            error: "The Owner account cannot be deactivated",
          };
        }
        if (currentAdmin.role === "ADMIN" && targetUser.role === "ADMIN") {
          return {
            ok: false,
            error: "Administrators cannot modify other Administrators",
          };
        }
      }

      const dataToUpdate: any = {};
      if (attributes.name !== undefined)
        dataToUpdate.name = attributes.name.trim();
      if (attributes.email !== undefined)
        dataToUpdate.email = attributes.email.toLowerCase().trim();
      if (attributes.role !== undefined) dataToUpdate.role = attributes.role;
      if (attributes.isActive !== undefined)
        dataToUpdate.isActive = attributes.isActive;
      if (attributes.phone !== undefined)
        dataToUpdate.phone = attributes.phone?.trim() ?? null;
      if (attributes.avatarUrl !== undefined)
        dataToUpdate.avatarUrl = attributes.avatarUrl;
      if (attributes.permissions !== undefined)
        dataToUpdate.permissions = attributes.permissions;
      if (attributes.password)
        dataToUpdate.passwordHash = await hashPassword(attributes.password);

      const updated = await prisma.internalUser.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          permissions: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      return {
        ok: true,
        data: {
          ...updated,
          role: updated.role as InternalUserRole,
          permissions: (updated.permissions as string[]) ?? [],
          avatarUrl: updated.avatarUrl || getAvatarSync(updated),
        },
      };
    } catch (error: any) {
      console.error("adminAuth.updateUser error:", error);
      return { ok: false, error: error?.message || "Failed to update user" };
    }
  },

  updateUserById: async (
    id: string,
    attributes: UpdateUserAttributes,
  ): Promise<AuthActionResult<TeamMember>> => {
    return adminAuth.updateUser(id, attributes);
  },

  deleteUser: async (
    id: string,
  ): Promise<
    | { ok: true; action: "deleted" | "deactivated"; message: string }
    | { ok: false; error: string }
  > => {
    try {
      const { user: currentAdmin } = await requireAdminSession();
      if (currentAdmin.id === id) {
        return { ok: false, error: "You cannot delete your own account" };
      }
      if (currentAdmin.role === "STAFF") {
        return {
          ok: false,
          error:
            "Staff members do not have permission to delete team members",
        };
      }

      const targetUser = await prisma.internalUser.findUnique({
        where: { id },
      });
      if (!targetUser) return { ok: false, error: "Team member not found" };
      if (targetUser.role === "OWNER")
        return { ok: false, error: "The Owner account cannot be deleted" };
      if (currentAdmin.role === "ADMIN" && targetUser.role === "ADMIN") {
        return {
          ok: false,
          error: "Administrators cannot delete other Administrators",
        };
      }

      if (targetUser.lastLoginAt) {
        await prisma.internalUser.update({
          where: { id },
          data: { isActive: false },
        });
        return {
          ok: true,
          action: "deactivated",
          message:
            "Team member has activity history and was deactivated to preserve records.",
        };
      }

      await prisma.internalUser.delete({ where: { id } });
      return {
        ok: true,
        action: "deleted",
        message: "Team member deleted successfully.",
      };
    } catch (error: any) {
      console.error("adminAuth.deleteUser error:", error);
      return { ok: false, error: error?.message || "Failed to delete user" };
    }
  },

  get team() {
    return {
      list: adminAuth.listUsers,
      get: adminAuth.getUserById,
      create: adminAuth.createUser,
      update: adminAuth.updateUser,
      delete: adminAuth.deleteUser,
    };
  },

  hashPassword,
  verifyPassword,
};
