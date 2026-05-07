"use client";

const DEFAULT_ICON = "💸";

const CATEGORY_ICON_RULES: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ["food", "dining", "ăn", "uong", "uống", "restaurant", "cafe", "coffee"], icon: "🍽️" },
  { keywords: ["shopping", "mua sắm", "mua sam", "shop", "retail", "mall"], icon: "🛍️" },
  { keywords: ["rent", "thuê", "thue", "house", "home"], icon: "🏠" },
  { keywords: ["transport", "di chuyển", "di chuyen", "taxi", "grab", "bus", "travel"], icon: "🚗" },
  { keywords: ["entertainment", "giải trí", "giai tri", "movie", "music", "game"], icon: "🎬" },
  { keywords: ["health", "healthcare", "sức khỏe", "suc khoe", "medical", "hospital"], icon: "🏥" },
  { keywords: ["education", "giáo dục", "giao duc", "school", "study", "learning"], icon: "🎓" },
  { keywords: ["utilities", "hóa đơn", "hoa don", "electric", "water", "internet", "wifi"], icon: "💡" },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function looksLikeMojibake(value: string): boolean {
  return /Ã|Â|ð/.test(value);
}

function isLikelyEmoji(value: string): boolean {
  try {
    return /\p{Extended_Pictographic}/u.test(value);
  } catch {
    return value.length <= 4 && /[^\w\s]/.test(value);
  }
}

function decodeLatin1AsUtf8(value: string): string {
  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

function getIconFromCategoryName(categoryName: string): string {
  const normalized = normalizeText(categoryName || "");
  if (!normalized) {
    return DEFAULT_ICON;
  }

  const matched = CATEGORY_ICON_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
  );
  return matched?.icon ?? DEFAULT_ICON;
}

export function getCategoryIcon(icon: string | null | undefined, categoryName: string): string {
  const mappedIcon = getIconFromCategoryName(categoryName);
  if (mappedIcon !== DEFAULT_ICON) {
    return mappedIcon;
  }

  const rawIcon = (icon || "").trim();
  if (!rawIcon) {
    return DEFAULT_ICON;
  }

  const decodedIcon = looksLikeMojibake(rawIcon) ? decodeLatin1AsUtf8(rawIcon) : rawIcon;
  if (isLikelyEmoji(decodedIcon) && !looksLikeMojibake(decodedIcon)) {
    return decodedIcon;
  }

  return DEFAULT_ICON;
}
