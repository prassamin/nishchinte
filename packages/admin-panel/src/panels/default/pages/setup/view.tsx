"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { actions } from "@nishchinte/server/actions";
import { z } from "zod";

export const signUpSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function SetupView() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof z.infer<typeof signUpSchema> | "phone", string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();

  async function handleSetup() {
    setFieldErrors({});
    setFormError(null);

    const validation = signUpSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const errs: Partial<Record<keyof z.infer<typeof signUpSchema>, string>> =
        {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof z.infer<typeof signUpSchema>;
        if (!errs[field]) errs[field] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    const result = await actions.admin.setupInitialAdmin({
      fullName,
      email,
      password,
      confirmPassword,
      phone,
    });

    if (!result.ok) {
      setLoading(false);
      setFormError(result.error ?? "Something went wrong");
      return;
    }

    router.push(result.redirectTo ?? "/admin");
    router.refresh();
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
        <div className="w-full max-w-lg rounded-2xl border border-ap-border/80 bg-ap-surface/70 p-8 shadow-xl backdrop-blur-md">
          <div className="text-center">
            <div className="inline-flex items-center rounded-full border border-ap-border bg-ap-surface-secondary px-3.5 py-1 text-xs font-medium text-ap-muted">
              Initial Store Setup
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-ap-foreground">
              Create Store Owner Account
            </h1>
            <p className="mt-2 text-sm text-ap-muted">
              Set up the primary administrator account to manage your store.
            </p>
          </div>

          {formError ? (
            <div className="mt-6 rounded-xl border border-ap-danger/30 bg-ap-danger/10 px-4 py-3 text-sm text-ap-danger">
              {formError}
            </div>
          ) : null}

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSetup();
            }}
          >
            <div>
              <label
                htmlFor="fullName"
                className="mb-1.5 block text-sm font-medium text-ap-foreground"
              >
                Full Name
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ap-muted"
                />
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g. PRAS Samin"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputBase}
                />
              </div>
              {fieldErrors.fullName ? (
                <p className="mt-1.5 text-xs text-ap-danger">
                  {fieldErrors.fullName}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="email"
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
                  id="email"
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
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-ap-foreground"
              >
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone
                  size={15}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ap-muted"
                />
                <input
                  id="phone"
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputBase}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
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
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputBase}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ap-muted hover:text-ap-foreground transition"
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-ap-foreground"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ap-muted"
                />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputBase}
                />
              </div>
              {fieldErrors.confirmPassword ? (
                <p className="mt-1.5 text-xs text-ap-danger">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-ap-accent px-4 py-3.5 text-sm font-semibold text-ap-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Setting up store..." : "Create Store & Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
