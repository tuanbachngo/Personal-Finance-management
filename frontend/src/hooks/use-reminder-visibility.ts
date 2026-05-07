"use client";

import { useEffect, useMemo, useState } from "react";

type UseReminderVisibilityParams = {
  userId?: number;
  accessToken?: string | null;
};

const STORAGE_PREFIX = "vault_reminders_hidden";

function buildStorageKey(userId?: number, accessToken?: string | null): string | null {
  if (!userId || !accessToken) {
    return null;
  }
  return `${STORAGE_PREFIX}_${userId}_${accessToken}`;
}

export function useReminderVisibility({ userId, accessToken }: UseReminderVisibilityParams) {
  const storageKey = useMemo(
    () => buildStorageKey(userId, accessToken),
    [userId, accessToken],
  );

  const [hiddenReminderIds, setHiddenReminderIds] = useState<string[]>([]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setHiddenReminderIds([]);
      return;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setHiddenReminderIds([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setHiddenReminderIds(parsed.filter((item) => typeof item === "string"));
        return;
      }
    } catch {
      // ignore malformed local storage data
    }

    setHiddenReminderIds([]);
  }, [storageKey]);

  const dismissReminder = (id: string) => {
    setHiddenReminderIds((current) => {
      const next = Array.from(new Set([...current, id]));
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  return {
    hiddenReminderIds,
    dismissReminder,
  };
}

