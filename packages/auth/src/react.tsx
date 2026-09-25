"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type {
  AdminSessionPayload,
  CustomerUser,
  CustomerAuthMode,
  SignOutOptions,
  AuthCapabilities,
} from "./types";
import { getAvatarSync } from "@nishchinte/utils";

const DEFAULT_CAPABILITIES: AuthCapabilities = {
  mode: "hybrid",
  hasSms: false,
  hasEmail: false,
  hasOtpTransport: true,
  supportedChannels: ["SMS", "EMAIL"],
  isDevMode: true,
  otpCooldownSeconds: 60,
  otpLength: 6,
  isAuthEnabled: true,
};

export interface AuthContextValue {
  admin: AdminSessionPayload | null;
  customer: CustomerUser | null;
  customerAuthMode: CustomerAuthMode;
  capabilities: AuthCapabilities;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: (options?: SignOutOptions) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  initialAdmin?: AdminSessionPayload | null;
  initialCustomer?: CustomerUser | null;
  customerAuthMode?: CustomerAuthMode;
  initialCapabilities?: Partial<AuthCapabilities>;
  onNavigate?: (url: string) => void;
  onRefresh?: () => void;
}

export function AuthProvider({
  children,
  initialAdmin = null,
  initialCustomer = null,
  customerAuthMode = "hybrid",
  initialCapabilities,
}: AuthProviderProps) {
  const [admin, setAdmin] = useState<AdminSessionPayload | null>(initialAdmin);
  const [customer, setCustomer] = useState<CustomerUser | null>(
    initialCustomer,
  );
  const [mode, setMode] = useState<CustomerAuthMode>(customerAuthMode);
  const [capabilities, setCapabilities] = useState<AuthCapabilities>({
    ...DEFAULT_CAPABILITIES,
    mode: customerAuthMode,
    ...initialCapabilities,
  });
  const [isLoading, setIsLoading] = useState<boolean>(
    !initialAdmin && !initialCustomer,
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAdmin(data.admin ?? null);
        setCustomer(data.customer ?? null);
        if (data.customerAuthMode) {
          setMode(data.customerAuthMode);
        }
        if (data.capabilities) {
          setCapabilities(data.capabilities);
        }
      } else {
        setAdmin(null);
        setCustomer(null);
      }
    } catch {
      setAdmin(null);
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(
    async (options: SignOutOptions = { scope: "local" }) => {
      try {
        await fetch("/api/v1/auth/sign-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options),
        });
      } finally {
        setAdmin(null);
        setCustomer(null);
      }
    },
    [],
  );

  useEffect(() => {
    // Fetch initial auth state if not provided via SSR props
    if (!initialAdmin && !initialCustomer) {
      void refresh();
    }

    // Auto-refresh when tab/window regains focus or becomes visible
    const handleFocus = () => void refresh();
    const handleVisibilityChange = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        void refresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh, initialAdmin, initialCustomer]);

  return (
    <AuthContext.Provider
      value={{
        admin,
        customer,
        customerAuthMode: mode,
        capabilities,
        isLoading,
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access Admin authentication state and actions.
 */
export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an <AuthProvider>");
  }

  return {
    user: context.admin,
    isAuthenticated: !!context.admin?.id,
    isLoading: context.isLoading,
    role: context.admin?.role ?? null,
    avatarUrl:
      context.admin?.avatarUrl ??
      (context.admin ? getAvatarSync(context.admin) : ""),
    permissions: context.admin?.permissions ?? [],
    refresh: context.refresh,
    signOut: context.signOut,
  };
}

/**
 * Hook to access Customer authentication state, capabilities, and actions.
 * Aware of the 3 Storefront Auth Modes (authless, auth, hybrid) and active transports (SMS, Email).
 */
export function useCustomerAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used within an <AuthProvider>");
  }

  const mode = context.customerAuthMode;
  const caps = context.capabilities;

  const canSendSmsOtp = caps.hasSms || caps.isDevMode;
  const canSendEmailOtp = caps.hasEmail || caps.isDevMode;
  const canUseOtp = caps.hasOtpTransport;
  const canUsePassword = true;

  return {
    user: context.customer,
    customer: context.customer,
    isAuthenticated: !!context.customer?.id,
    isLoading: context.isLoading,
    mode,
    isAuthless: mode === "authless",
    isStrictAuth: mode === "auth",
    isHybrid: mode === "hybrid",
    isAuthEnabled: mode !== "authless",
    capabilities: caps,
    canSendSmsOtp,
    canSendEmailOtp,
    canUseOtp,
    canUsePassword,
    supportedChannels: caps.supportedChannels,
    otpCooldownSeconds: caps.otpCooldownSeconds,
    isDevMode: caps.isDevMode,
    refresh: context.refresh,
    signOut: context.signOut,
  };
}

/**
 * Universal auth hook combining Admin, Customer, and Capability state.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
