"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/providers/auth-provider";

type AuthGuardProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter();
  const { ready, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (requireAdmin && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [ready, isAuthenticated, isAdmin, requireAdmin, router]);

  if (!ready) {
    return <p className="text-sm text-muted">Loading session...</p>;
  }
  if (!isAuthenticated) {
    return <p className="text-sm text-muted">Redirecting to login...</p>;
  }
  if (requireAdmin && !isAdmin) {
    return <p className="text-sm text-muted">Redirecting...</p>;
  }

  return <>{children}</>;
}

