"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getMetaUsers } from "@/lib/api-client";
import type { UserBasic } from "@/types/api";

import { useAuth } from "./auth-provider";

type ScopeMode = "USER" | "ADMIN";

type UserScopeContextValue = {
  users: UserBasic[];
  loadingUsers: boolean;
  selectedUserId: number | null;
  setSelectedUserId: (userId: number) => void;
  refreshUsers: () => Promise<void>;

  /**
   * ADMIN account can switch between:
   * - USER: behave like a normal user, scoped to their own UserID
   * - ADMIN: show admin-only navigation and allow selecting another user scope
   */
  scopeMode: ScopeMode;
  setScopeMode: (mode: ScopeMode) => void;
  effectiveIsAdmin: boolean;
};

const UserScopeContext = createContext<UserScopeContextValue | null>(null);

const STORAGE_USER_ID_KEY = "pf_scope_user_id";
const STORAGE_MODE_KEY = "pf_scope_mode";

export function UserScopeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserBasic[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserIdState] = useState<number | null>(null);
  const [scopeModeState, setScopeModeState] = useState<ScopeMode>("USER");

  const effectiveIsAdmin = isAdmin && scopeModeState === "ADMIN";

  const refreshUsers = async () => {
    if (!isAuthenticated || !user) {
      setUsers([]);
      setSelectedUserIdState(null);
      setScopeModeState("USER");
      return;
    }

    if (!isAdmin) {
      setUsers([
        {
          UserID: user.UserID,
          UserName: user.UserName,
          Email: user.Email,
          PhoneNumber: user.PhoneNumber
        }
      ]);
      setSelectedUserIdState(user.UserID);
      setScopeModeState("USER");
      return;
    }

    const storedModeRaw = localStorage.getItem(STORAGE_MODE_KEY);
    const storedMode: ScopeMode = storedModeRaw === "ADMIN" ? "ADMIN" : "USER";
    setScopeModeState(storedMode);

    setLoadingUsers(true);
    try {
      const rows = await getMetaUsers();
      setUsers(rows);

      if (storedMode === "USER") {
        setSelectedUserIdState(user.UserID);
        localStorage.setItem(STORAGE_USER_ID_KEY, String(user.UserID));
        return;
      }

      const storedUserIdRaw = localStorage.getItem(STORAGE_USER_ID_KEY);
      const storedUserId = storedUserIdRaw ? Number(storedUserIdRaw) : NaN;
      const fallbackUserId = rows[0]?.UserID ?? user.UserID;
      const hasStored = rows.some((row) => row.UserID === storedUserId);
      const resolvedUserId = hasStored ? storedUserId : fallbackUserId;

      setSelectedUserIdState(resolvedUserId);
      localStorage.setItem(STORAGE_USER_ID_KEY, String(resolvedUserId));
    } catch (error) {
      console.error("Failed to load users for scope", error);
      setUsers([
        {
          UserID: user.UserID,
          UserName: user.UserName,
          Email: user.Email,
          PhoneNumber: user.PhoneNumber
        }
      ]);
      setSelectedUserIdState(user.UserID);
      setScopeModeState("USER");
      localStorage.setItem(STORAGE_MODE_KEY, "USER");
      localStorage.setItem(STORAGE_USER_ID_KEY, String(user.UserID));
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    void refreshUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAdmin, user?.UserID]);

  const setSelectedUserId = (userId: number) => {
    setSelectedUserIdState(userId);
    localStorage.setItem(STORAGE_USER_ID_KEY, String(userId));
  };

  const setScopeMode = (mode: ScopeMode) => {
    setScopeModeState(mode);
    localStorage.setItem(STORAGE_MODE_KEY, mode);

    if (mode === "USER" && user) {
      setSelectedUserIdState(user.UserID);
      localStorage.setItem(STORAGE_USER_ID_KEY, String(user.UserID));
      return;
    }

    if (mode === "ADMIN") {
      const fallbackUserId = selectedUserId ?? users[0]?.UserID ?? user?.UserID ?? null;

      if (fallbackUserId !== null) {
        setSelectedUserIdState(fallbackUserId);
        localStorage.setItem(STORAGE_USER_ID_KEY, String(fallbackUserId));
      }
    }
  };

  const value = useMemo<UserScopeContextValue>(
    () => ({
      users,
      loadingUsers,
      selectedUserId,
      setSelectedUserId,
      refreshUsers,
      scopeMode: scopeModeState,
      setScopeMode,
      effectiveIsAdmin
    }),
    [users, loadingUsers, selectedUserId, scopeModeState, effectiveIsAdmin]
  );

  return <UserScopeContext.Provider value={value}>{children}</UserScopeContext.Provider>;
}

export function useUserScope() {
  const ctx = useContext(UserScopeContext);
  if (!ctx) {
    throw new Error("useUserScope must be used inside UserScopeProvider");
  }
  return ctx;
}
