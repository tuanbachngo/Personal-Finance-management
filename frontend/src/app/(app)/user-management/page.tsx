"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { DataTable } from "@/components/common/data-table";
import { AppShell } from "@/components/layout/app-shell";
import {
  createUserProfile,
  deleteUserProfile,
  extractApiErrorMessage,
  getMetaBanks,
  getUserProfiles,
  updateUserProfile
} from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const profilesQuery = useQuery({
    queryKey: ["user-profiles"],
    queryFn: getUserProfiles
  });
  const banksQuery = useQuery({
    queryKey: ["meta-banks-user-management"],
    queryFn: getMetaBanks
  });

  const [selectedUserId, setSelectedUserId] = useState(0);
  const selectedUser = useMemo(
    () => (profilesQuery.data || []).find((row) => row.UserID === selectedUserId) || null,
    [profilesQuery.data, selectedUserId]
  );

  const [addForm, setAddForm] = useState({
    userName: "",
    email: "",
    phone: "",
    password: "",
    bankId: 0,
    role: "USER",
    recoveryHint: "",
    recoveryAnswer: ""
  });

  const [editForm, setEditForm] = useState({
    userName: "",
    email: "",
    phone: "",
    newPassword: "",
    role: "USER",
    isActive: 1,
    recoveryHint: "",
    recoveryAnswer: ""
  });

  const createMutation = useMutation({
    mutationFn: createUserProfile,
    onSuccess: async (res) => {
      alert(`${res.message} UserID=${res.id}`);
      await queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
    },
    onError: (error) => alert(extractApiErrorMessage(error, "Failed to create user."))
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, payload }: { uid: number; payload: Parameters<typeof updateUserProfile>[1] }) =>
      updateUserProfile(uid, payload),
    onSuccess: async (res) => {
      alert(res.message);
      await queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
    },
    onError: (error) => alert(extractApiErrorMessage(error, "Failed to update user."))
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUserProfile,
    onSuccess: async (res) => {
      alert(res.message);
      await queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
    },
    onError: (error) => alert(extractApiErrorMessage(error, "Failed to delete user."))
  });

  const loadSelectedForEdit = (userId: number) => {
    setSelectedUserId(userId);
    const row = (profilesQuery.data || []).find((item) => item.UserID === userId);
    if (!row) {
      return;
    }
    setEditForm({
      userName: row.UserName || "",
      email: row.Email || "",
      phone: row.PhoneNumber || "",
      newPassword: "",
      role: row.UserRole || "USER",
      isActive: Number(row.IsActive ?? 1),
      recoveryHint: "",
      recoveryAnswer: ""
    });
  };

  return (
    <AuthGuard requireAdmin>
      <AppShell title="User Management" subtitle="Admin workspace for profile list, create, edit, and delete operations.">
        <DataTable
          title="Users"
          rows={(profilesQuery.data || []).map((row) => ({
            UserID: row.UserID,
            UserName: row.UserName,
            Email: row.Email,
            PhoneNumber: row.PhoneNumber || "",
            HasCredentials: row.HasCredentials,
            UserRole: row.UserRole,
            IsActive: row.IsActive,
            LastLoginAt: formatDateTime(row.LastLoginAt)
          }))}
          emptyMessage="No users found."
        />

        <div className="mt-4 rounded-lg border border-border bg-bg p-3">
          <label className="mb-1 block text-sm text-muted">Select user for detail/edit</label>
          <select
            value={selectedUserId}
            onChange={(event) => loadSelectedForEdit(Number(event.target.value))}
            className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
          >
            <option value={0}>Search user by name or email</option>
            {(profilesQuery.data || []).map((row) => (
              <option key={row.UserID} value={row.UserID}>
                {row.UserName} ({row.Email})
              </option>
            ))}
          </select>
        </div>

        {selectedUser ? (
          <div className="mt-4">
            <DataTable
              title="Current profile details"
              rows={[
                {
                  UserID: selectedUser.UserID,
                  UserName: selectedUser.UserName,
                  Email: selectedUser.Email,
                  PhoneNumber: selectedUser.PhoneNumber || "",
                  HasCredentials: selectedUser.HasCredentials,
                  UserRole: selectedUser.UserRole,
                  IsActive: selectedUser.IsActive
                }
              ]}
            />
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-bg p-3">
            <h3 className="mb-2 text-sm text-muted">Add User</h3>
            <div className="space-y-2">
              <input
                placeholder="User name"
                value={addForm.userName}
                onChange={(event) => setAddForm((s) => ({ ...s, userName: event.target.value }))}
                className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              />
              <input
                placeholder="Email"
                value={addForm.email}
                onChange={(event) => setAddForm((s) => ({ ...s, email: event.target.value }))}
                className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              />
              <input
                placeholder="Phone number (optional)"
                value={addForm.phone}
                onChange={(event) => setAddForm((s) => ({ ...s, phone: event.target.value }))}
                className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              />
              <select
                value={addForm.bankId}
                onChange={(event) => setAddForm((s) => ({ ...s, bankId: Number(event.target.value) }))}
                className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              >
                <option value={0}>Initial bank</option>
                {(banksQuery.data || []).map((row) => (
                  <option key={row.BankID} value={row.BankID}>
                    {row.BankCode} - {row.BankName}
                  </option>
                ))}
              </select>
              <input
                placeholder="Initial password"
                type="password"
                value={addForm.password}
                onChange={(event) => setAddForm((s) => ({ ...s, password: event.target.value }))}
                className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              />
              <input
                placeholder="Recovery hint (optional)"
                value={addForm.recoveryHint}
                onChange={(event) => setAddForm((s) => ({ ...s, recoveryHint: event.target.value }))}
                className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              />
              <input
                placeholder="Recovery answer (optional)"
                type="password"
                value={addForm.recoveryAnswer}
                onChange={(event) => setAddForm((s) => ({ ...s, recoveryAnswer: event.target.value }))}
                className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              />
              <select
                value={addForm.role}
                onChange={(event) => setAddForm((s) => ({ ...s, role: event.target.value }))}
                className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <button
                type="button"
                className="focus-ring rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg"
                onClick={() =>
                  createMutation.mutate({
                    user_name: addForm.userName,
                    email: addForm.email,
                    phone_number: addForm.phone || null,
                    password: addForm.password,
                    bank_id: addForm.bankId,
                    user_role: addForm.role,
                    recovery_hint: addForm.recoveryHint || null,
                    recovery_answer: addForm.recoveryAnswer || null
                  })
                }
              >
                Add user
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg p-3">
            <h3 className="mb-2 text-sm text-muted">Edit User</h3>
            {!selectedUser ? (
              <p className="text-sm text-muted">Select user first.</p>
            ) : (
              <div className="space-y-2">
                <input
                  placeholder="User name"
                  value={editForm.userName}
                  onChange={(event) => setEditForm((s) => ({ ...s, userName: event.target.value }))}
                  className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
                />
                <input
                  placeholder="Email"
                  value={editForm.email}
                  onChange={(event) => setEditForm((s) => ({ ...s, email: event.target.value }))}
                  className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
                />
                <input
                  placeholder="Phone"
                  value={editForm.phone}
                  onChange={(event) => setEditForm((s) => ({ ...s, phone: event.target.value }))}
                  className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
                />
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={editForm.newPassword}
                  onChange={(event) => setEditForm((s) => ({ ...s, newPassword: event.target.value }))}
                  className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
                />
                <select
                  value={editForm.role}
                  onChange={(event) => setEditForm((s) => ({ ...s, role: event.target.value }))}
                  className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <select
                  value={editForm.isActive}
                  onChange={(event) => setEditForm((s) => ({ ...s, isActive: Number(event.target.value) }))}
                  className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
                <input
                  placeholder="Recovery hint (optional)"
                  value={editForm.recoveryHint}
                  onChange={(event) => setEditForm((s) => ({ ...s, recoveryHint: event.target.value }))}
                  className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
                />
                <input
                  type="password"
                  placeholder="Recovery answer (optional)"
                  value={editForm.recoveryAnswer}
                  onChange={(event) => setEditForm((s) => ({ ...s, recoveryAnswer: event.target.value }))}
                  className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
                />
                <button
                  type="button"
                  className="focus-ring rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg"
                  onClick={() => {
                    if (!selectedUser) {
                      return;
                    }
                    updateMutation.mutate({
                      uid: selectedUser.UserID,
                      payload: {
                        user_name: editForm.userName,
                        email: editForm.email,
                        phone_number: editForm.phone || null,
                        new_password: editForm.newPassword || null,
                        user_role: editForm.role || null,
                        is_active: editForm.isActive,
                        recovery_hint: editForm.recoveryHint || null,
                        recovery_answer: editForm.recoveryAnswer || null
                      }
                    });
                  }}
                >
                  Update user
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-bg p-3">
            <h3 className="mb-2 text-sm text-muted">Delete User</h3>
            <p className="mb-2 text-xs text-muted">Admin cannot delete currently signed-in account.</p>
            <button
              type="button"
              className="focus-ring rounded-md border border-danger/50 px-3 py-2 text-sm text-danger"
              onClick={() => {
                if (!selectedUser) {
                  alert("Select a user first.");
                  return;
                }
                if (selectedUser.UserID === user?.UserID) {
                  alert("You cannot delete your current admin account.");
                  return;
                }
                if (!window.confirm(`Delete user ${selectedUser.UserName}?`)) {
                  return;
                }
                deleteMutation.mutate(selectedUser.UserID);
              }}
            >
              Delete selected user
            </button>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

