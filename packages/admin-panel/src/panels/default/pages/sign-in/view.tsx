"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { signInSchema, type SignInInput } from "@nishchinte/auth";
import { actions } from "@nishchinte/server/actions";

export function AdminSignInView() {
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SignInInput, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const urlMessage = searchParams.get("message");

  async function handleAdminSignIn() {
    setFieldErrors({});
    setFormError(null);

    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const errs: Partial<Record<keyof SignInInput, string>> = {};
      result.error.issues.forEach((issue: any) => {
        const field = issue.path[0] as keyof SignInInput;
        if (!errs[field]) errs[field] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }

    try {
      setEmailLoading(true);
      const actionResult = await actions.admin.signIn({ email, password });
      if (!actionResult.ok) {
        setEmailLoading(false);
        setFormError(actionResult.error || "Sign in failed");
        return;
      }

      const targetUrl = nextParam || "/admin";
      router.push(targetUrl);
      router.refresh();
    } catch (err: any) {
      setEmailLoading(false);
      setFormError(
        err?.message || "An unexpected error occurred during sign in.",
      );
    }
  }

  const inputBase =
    "w-full rounded-xl border border-ap-border bg-ap-field-background px-11 py-3 text-sm text-ap-field-foreground placeholder:text-ap-field-placeholder outline-none transition-colors duration-200 focus:border-ap-focus";

  return (
    <div className="relative min-h-screen overflow-hidden bg-ap-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 h-120 w-120 -translate-x-1/2 rounded-full bg-ap-accent/18 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-ap-accent/12 blur-3xl" />
        <div className="absolute -right-20 top-16 h-80 w-80 rounded-full bg-ap-warning/12 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-ap-border/80 bg-ap-surface/70 p-8 shadow-xl backdrop-blur-md">
          <div className="text-center">
            <div className="inline-flex items-center rounded-full border border-ap-border bg-ap-surface-secondary px-3.5 py-1 text-xs font-medium text-ap-muted">
              Merchant Control Panel
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ap-foreground">
              Admin Sign In
            </h1>
            <p className="mt-2 text-sm text-ap-muted">
              Enter your credentials to access your store dashboard.
            </p>
          </div>

          {urlMessage ? (
            <div className="mt-4 rounded-xl border border-ap-warning/30 bg-ap-warning/10 px-4 py-3 text-sm text-ap-warning">
              {urlMessage}
            </div>
          ) : null}

          {formError ? (
            <div className="mt-4 rounded-xl border border-ap-danger/30 bg-ap-danger/10 px-4 py-3 text-sm text-ap-danger">
              {formError}
            </div>
          ) : null}

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAdminSignIn();
            }}
          >
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-sm font-medium text-ap-foreground"
              >
                Admin Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ap-muted"
                />
                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@yourstore.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputBase}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email ? (
                <p className="mt-1.5 text-xs text-ap-danger">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-sm font-medium text-ap-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ap-muted"
                />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputBase}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ap-muted hover:text-ap-foreground transition"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="mt-1.5 text-xs text-ap-danger">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="mt-6 w-full rounded-xl bg-ap-accent px-4 py-3.5 text-sm font-semibold text-ap-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {emailLoading ? "Signing in..." : "Sign In to Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
