"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { logout } from "@/lib/api-client";
import type { AuthUser, LoginResponse } from "@/types/api";

type AuthContextValue = {
  ready: boolean;
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setSession: (loginResponse: LoginResponse) => void;
  setAuthUser: (nextUser: AuthUser | null) => void;
  clearSession: (callApi?: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "pf_access_token";
const USER_KEY = "pf_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUserRaw = localStorage.getItem(USER_KEY);

    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUserRaw) {
      try {
        const parsed = JSON.parse(storedUserRaw) as AuthUser;
        setUser(parsed);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    setReady(true);
  }, []);

  const setSession = (loginResponse: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, loginResponse.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(loginResponse.user));
    localStorage.setItem("pf_user_name", loginResponse.user.UserName);
    localStorage.setItem("pf_user_email", loginResponse.user.Email);
    setToken(loginResponse.access_token);
    setUser(loginResponse.user);
  };

  const setAuthUser = (nextUser: AuthUser | null) => {
    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      localStorage.setItem("pf_user_name", nextUser.UserName);
      localStorage.setItem("pf_user_email", nextUser.Email);
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem("pf_user_name");
      localStorage.removeItem("pf_user_email");
    }
    setUser(nextUser);
  };

  const clearSession = async (callApi = true) => {
    if (callApi) {
      try {
        await logout();
      } catch {
        // ignore network/session errors on local cleanup
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("pf_user_name");
    localStorage.removeItem("pf_user_email");
    localStorage.removeItem("pf_scope_user_id");
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isAdmin: String(user?.UserRole || "USER").toUpperCase() === "ADMIN",
      setSession,
      setAuthUser,
      clearSession
    }),
    [ready, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

