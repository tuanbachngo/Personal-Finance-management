"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";

export default function RootPage() {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!ready) {
      return;
    }
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [ready, isAuthenticated, router]);

  return null;
}
