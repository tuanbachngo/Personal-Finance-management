"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getMetaUsers } from "@/lib/api-client";
import type { UserBasic } from "@/types/api";

import { useAuth } from "./auth-provider";

type UserScopeContextValue = {
  users: UserBasic[];
  loadingUsers: boolean;
  selectedUserId: number | null;
  setSelectedUserId: (userId: number) => void;
  refreshUsers: () => Promise<void>;
};

const UserScopeContext = createContext<UserScopeContextValue | null>(null);

const STORAGE_KEY = "pf_scope_user_id";

export function UserScopeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserBasic[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserIdState] = useState<number | null>(null);

  const refreshUsers = async () => {
    if (!isAuthenticated || !user) {
      setUsers([]);
      setSelectedUserIdState(null);
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
      return;
    }

    setLoadingUsers(true);
    try {
      const rows = await getMetaUsers();
      setUsers(rows);
      const storedUserIdRaw = localStorage.getItem(STORAGE_KEY);
      const storedUserId = storedUserIdRaw ? Number(storedUserIdRaw) : NaN;
      const fallbackUserId = rows[0]?.UserID ?? user.UserID;
      const hasStored = rows.some((row) => row.UserID === storedUserId);
      const resolvedUserId = hasStored ? storedUserId : fallbackUserId;
      setSelectedUserIdState(resolvedUserId);
      localStorage.setItem(STORAGE_KEY, String(resolvedUserId));
    } catch (error) {
      console.error("Failed to load users for scope", error);
      // Fallback to self if API fails (e.g. 401 Unauthenticated due to stale token)
      setUsers([
        {
          UserID: user.UserID,
          UserName: user.UserName,
          Email: user.Email,
          PhoneNumber: user.PhoneNumber
        }
      ]);
      setSelectedUserIdState(user.UserID);
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
    localStorage.setItem(STORAGE_KEY, String(userId));
  };

  const value = useMemo<UserScopeContextValue>(
    () => ({
      users,
      loadingUsers,
      selectedUserId,
      setSelectedUserId,
      refreshUsers
    }),
    [users, loadingUsers, selectedUserId]
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

