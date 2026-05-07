function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function tryParseIsoDate(value: string): { day: string; month: string; year: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((value || "").trim());
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  return { day, month, year };
}

function toDdMmYyyy(parsed: Date): string {
  return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

export function formatCurrency(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(normalized))} ₫`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const isoParts = tryParseIsoDate(value);
  if (isoParts) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const time = `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
      if (time !== "00:00") {
        return `${isoParts.day}/${isoParts.month}/${isoParts.year} ${time}`;
      }
    }
    return `${isoParts.day}/${isoParts.month}/${isoParts.year}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${toDdMmYyyy(parsed)} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const isoParts = tryParseIsoDate(value);
  if (isoParts) {
    return `${isoParts.day}/${isoParts.month}/${isoParts.year}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return toDdMmYyyy(parsed);
}
