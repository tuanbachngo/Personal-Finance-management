"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { extractApiErrorMessage, login } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { ready, isAuthenticated, setSession } = useAuth();
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [ready, isAuthenticated, router]);

  const mutation = useMutation({
    mutationFn: login
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    try {
      const result = await mutation.mutateAsync(values);
      setSession(result);
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = extractApiErrorMessage(error, "Login failed.");
      setFormError(message);
    }
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center p-6">
      <section className="w-full rounded-lg border border-border bg-surface p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-text">Personal Finance Login</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to access your dashboard and account overview.
          </p>
        </div>

        {!ready ? <p className="mb-3 text-sm text-muted">Checking session...</p> : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Email</span>
            <input
              type="email"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email ? (
              <span className="mt-1 block text-xs text-danger">{errors.email.message}</span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-muted">Password</span>
            <input
              type="password"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              placeholder="Enter your password"
              {...register("password")}
            />
            {errors.password ? (
              <span className="mt-1 block text-xs text-danger">{errors.password.message}</span>
            ) : null}
          </label>

          {formError ? (
            <div className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!ready || mutation.isPending}
            className="focus-ring w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg disabled:opacity-60"
          >
            {mutation.isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            className="focus-ring rounded-md border border-border px-3 py-2 text-center text-sm text-text hover:bg-surface-hover"
            href="/signup"
          >
            Sign up
          </Link>
          <Link
            className="focus-ring rounded-md border border-border px-3 py-2 text-center text-sm text-text hover:bg-surface-hover"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>

        <div className="mt-2">
          <Link className="text-xs text-muted underline" href="/verify-otp-unlock">
            Account locked? Verify unlock OTP
          </Link>
        </div>
      </section>
    </main>
  );
}

