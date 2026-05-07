type DataTableProps = {
  title?: string;
  rows: Record<string, unknown>[];
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (id: string, checked: boolean) => void;
  idKey?: string;
};

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function DataTable({ 
  title, 
  rows, 
  emptyMessage = "Không có dữ liệu.",
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  idKey = "id"
}: DataTableProps) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="rounded-lg border border-border bg-bg p-3">
      {title ? <h3 className="mb-3 text-sm font-medium text-text">{title}</h3> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                {selectable && (
                  <th className="border-b border-border px-2 py-2 text-left font-medium text-muted w-10">
                    {/* Header Checkbox optional */}
                  </th>
                )}
                {headers.map((header) => (
                  <th
                    key={header}
                    className="border-b border-border px-2 py-2 text-left font-medium text-muted"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const rowId = String(row[idKey] || index);
                const isSelected = selectedIds.includes(rowId);
                
                return (
                  <tr key={`row-${index}`} className={`hover:bg-surface-hover ${isSelected ? "bg-primary/5" : ""}`}>
                    {selectable && (
                      <td className="border-b border-border px-2 py-2 text-text">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          checked={isSelected}
                          onChange={(e) => onSelectionChange?.(rowId, e.target.checked)}
                        />
                      </td>
                    )}
                    {headers.map((header) => (
                      <td key={`${index}-${header}`} className="border-b border-border px-2 py-2 text-text">
                        {stringifyValue(row[header])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

