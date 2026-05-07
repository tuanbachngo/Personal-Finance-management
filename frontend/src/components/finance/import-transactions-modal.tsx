"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  confirmTransactionImport,
  extractApiErrorMessage,
  getMetaAccounts,
  getMetaCategories,
  previewTransactionImport
} from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { ImportPreviewResponse } from "@/types/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
};

type Step = 1 | 2 | 3 | 4;

type RowEditState = {
  action: "IMPORT" | "SKIP";
  final_category_id?: number | null;
};

export function ImportTransactionsModal({ isOpen, onClose, onImported }: Props) {
  const { user, isAdmin } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;

  const [step, setStep] = useState<Step>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<number>(0);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [rowEdits, setRowEdits] = useState<Record<number, RowEditState>>({});
  const [confirmSummary, setConfirmSummary] = useState<{
    imported_rows: number;
    skipped_rows: number;
    failed_rows: number;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["accounts", userId],
    queryFn: () => getMetaAccounts(userId),
    enabled: Boolean(userId) && isOpen
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getMetaCategories,
    enabled: isOpen
  });

  const previewMutation = useMutation({
    mutationFn: previewTransactionImport
  });

  const confirmMutation = useMutation({
    mutationFn: confirmTransactionImport
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setStep(1);
    setSelectedFile(null);
    setAccountId(0);
    setPreview(null);
    setRowEdits({});
    setConfirmSummary(null);
    setFormError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!preview) {
      setRowEdits({});
      return;
    }

    const nextState: Record<number, RowEditState> = {};
    preview.rows.forEach((row) => {
      nextState[row.row_id] = {
        action: String(row.action).toUpperCase() === "SKIP" ? "SKIP" : "IMPORT",
        final_category_id: row.suggested_category_id
      };
    });
    setRowEdits(nextState);
  }, [preview]);

  if (!isOpen) {
    return null;
  }

  const handleLoadPreview = async () => {
    if (!userId) {
      setFormError("Thiếu phạm vi người dùng.");
      return;
    }
    if (!selectedFile) {
      setFormError("Vui lòng chọn tệp CSV/Excel.");
      return;
    }
    if (!accountId) {
      setFormError("Vui lòng chọn tài khoản.");
      return;
    }

    setFormError(null);
    try {
      const response = await previewMutation.mutateAsync({
        file: selectedFile,
        account_id: accountId,
        user_id: userId
      });
      setPreview(response);
      setStep(3);
    } catch (error) {
      setPreview(null);
      setFormError(extractApiErrorMessage(error, "Không thể xem trước tệp import."));
    }
  };

  const handleConfirmImport = async () => {
    if (!userId || !preview) {
      return;
    }
    try {
      const rows = preview.rows.map((row) => ({
        row_id: row.row_id,
        action: (rowEdits[row.row_id]?.action || "IMPORT") as "IMPORT" | "SKIP",
        final_category_id: rowEdits[row.row_id]?.final_category_id ?? null
      }));

      const result = await confirmMutation.mutateAsync({
        batch_id: preview.batch_id,
        user_id: userId,
        rows
      });

      setConfirmSummary({
        imported_rows: result.imported_rows,
        skipped_rows: result.skipped_rows,
        failed_rows: result.failed_rows
      });
      onImported();
      setStep(4);
    } catch (error) {
      setFormError(extractApiErrorMessage(error, "Không thể xác nhận import."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-2xl border border-border bg-surface p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text">Import giao dịch</h2>
            <p className="text-xs text-muted">Bước {step} / 4</p>
          </div>
          <button onClick={onClose} className="text-muted transition-colors hover:text-text">
            &times; Đóng
          </button>
        </div>

        {step === 1 ? (
          <section className="rounded-xl border border-border bg-bg p-4">
            <p className="mb-3 text-sm font-semibold text-text">Bước 1: Chọn tệp</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.xlsm"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="focus-ring w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!selectedFile}
                className="focus-ring rounded-xl bg-primary px-4 py-2 text-sm font-bold text-bg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tiếp tục
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="rounded-xl border border-border bg-bg p-4">
            <p className="mb-3 text-sm font-semibold text-text">Bước 2: Chọn ngân hàng/tài khoản</p>
            <select
              value={accountId}
              onChange={(event) => setAccountId(Number(event.target.value))}
              className="focus-ring w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
            >
              <option value={0}>Chọn tài khoản</option>
              {(accountsQuery.data || []).map((row) => (
                <option key={row.AccountID} value={row.AccountID}>
                  {row.BankCode} - {row.BankName}
                </option>
              ))}
            </select>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="focus-ring rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-hover"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleLoadPreview}
                disabled={previewMutation.isPending || !accountId}
                className="focus-ring rounded-xl bg-primary px-4 py-2 text-sm font-bold text-bg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {previewMutation.isPending ? "Đang chuẩn bị xem trước..." : "Xem trước"}
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 && preview ? (
          <section className="rounded-xl border border-border bg-bg p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-text">
                Bước 3: Kiểm tra bản xem trước ({preview.total_rows} dòng)
              </p>
              <span className="text-xs text-muted">Lô #{preview.batch_id}</span>
            </div>

            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">Ngày</th>
                    <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">Mô tả</th>
                    <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">Loại</th>
                    <th className="border-b border-border px-3 py-3 text-right font-medium text-muted">Số tiền</th>
                    <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">Danh mục</th>
                    <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">Trùng lặp</th>
                    <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => {
                    const editState = rowEdits[row.row_id] || { action: "IMPORT" as const };
                    const isExpense = String(row.parsed_type).toUpperCase() === "EXPENSE";
                    const selectedCategoryId =
                      editState.final_category_id ?? row.suggested_category_id ?? 0;
                    const rowAction = editState.action || "IMPORT";

                    return (
                      <tr key={row.row_id} className="align-top transition-colors hover:bg-surface-hover">
                        <td className="border-b border-border px-3 py-3 text-text">
                          {row.parsed_date ? formatDate(row.parsed_date) : row.raw_date || "-"}
                        </td>
                        <td className="max-w-sm border-b border-border px-3 py-3 text-text">
                          {row.raw_description || "-"}
                          {row.error_message ? (
                            <p className="mt-1 text-xs text-danger">{row.error_message}</p>
                          ) : null}
                        </td>
                        <td className="border-b border-border px-3 py-3 text-text">{row.parsed_type || "-"}</td>
                        <td className="border-b border-border px-3 py-3 text-right font-mono font-semibold text-text">
                          {row.parsed_amount !== null ? formatCurrency(row.parsed_amount) : "-"}
                        </td>
                        <td className="border-b border-border px-3 py-3 text-text">
                          {isExpense ? (
                            <select
                              value={selectedCategoryId}
                              onChange={(event) =>
                                setRowEdits((prev) => ({
                                  ...prev,
                                  [row.row_id]: {
                                    ...prev[row.row_id],
                                    action: rowAction,
                                    final_category_id: Number(event.target.value) || null
                                  }
                                }))
                              }
                              className="focus-ring w-44 rounded-lg border border-border bg-surface px-2 py-1 text-sm"
                            >
                              <option value={0}>Chọn danh mục</option>
                              {(categoriesQuery.data || []).map((category) => (
                                <option key={category.CategoryID} value={category.CategoryID}>
                                  {category.CategoryName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-muted">Không bắt buộc</span>
                          )}
                        </td>
                        <td className="border-b border-border px-3 py-3 text-text">
                          {row.is_duplicate ? (
                            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                              Có
                            </span>
                          ) : (
                            <span className="text-muted">Không</span>
                          )}
                        </td>
                        <td className="border-b border-border px-3 py-3 text-text">
                          <select
                            value={rowAction}
                            onChange={(event) =>
                              setRowEdits((prev) => ({
                                ...prev,
                                [row.row_id]: {
                                  ...prev[row.row_id],
                                  action: event.target.value === "SKIP" ? "SKIP" : "IMPORT",
                                  final_category_id: selectedCategoryId || null
                                }
                              }))
                            }
                            className="focus-ring rounded-lg border border-border bg-surface px-2 py-1 text-sm"
                          >
                            <option value="IMPORT">Nhập</option>
                            <option value="SKIP">Bỏ qua</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="focus-ring rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-hover"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={confirmMutation.isPending}
                className="focus-ring rounded-xl bg-success px-4 py-2 text-sm font-bold text-bg transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {confirmMutation.isPending ? "Đang nhập..." : "Xác nhận import"}
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 && confirmSummary ? (
          <section className="rounded-xl border border-border bg-bg p-4">
            <p className="text-sm font-semibold text-text">Bước 4: Hoàn tất import</p>
            <p className="mt-2 text-sm text-muted">
              Đã nhập: {confirmSummary.imported_rows} | Đã bỏ qua: {confirmSummary.skipped_rows} | Thất bại:{" "}
              {confirmSummary.failed_rows}
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="focus-ring rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-hover"
              >
                Đóng
              </button>
            </div>
          </section>
        ) : null}

        {formError ? (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {formError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
