# Frontend Design System (Monarch-Inspired Light Theme)

## Personal Finance Management System

This document defines the frontend design system for the **Personal Finance Management System**. It shifts the UI direction to a **Light Theme, Widget-based Dashboard** inspired by premium tools like Monarch Money.

The goal is to create an interface that feels clean, trustworthy, data-dense, and effortless to read.

---

## 1. Context and Goals

### Design Intent
Create a **bright, clean, minimal finance dashboard** that focuses heavily on data clarity. The interface uses a clean white surface with subtle borders, allowing semantic colors (green for income/safe, red for expense/danger, orange for brand/active) to guide the user's attention.

### Core Goals
- Make financial data the absolute centerpiece.
- Use a widget-like grid layout for the dashboard.
- Group and format transactions cleanly without heavy grid lines.
- Use visual progress bars for budgets and goals.
- Avoid TailwindCSS unless explicitly requested; use Vanilla CSS / CSS Modules for structure.

---

## 2. Design Tokens and Foundations

### 2.1 Color Tokens
Use semantic variables. Do not hardcode hex values.

| Token | Hex | Usage |
|---|---|---|
| `--color-bg-app` | `#F9FAFB` | The main application background (very light gray) |
| `--color-surface` | `#FFFFFF` | Cards, panels, dropdowns |
| `--color-surface-hover` | `#F3F4F6` | Table row hover, subtle interactive states |
| `--color-border` | `#E5E7EB` | Card borders, table horizontal dividers |
| `--color-primary` | `#FF5A36` | Brand accent, active tabs, primary buttons |
| `--color-success` | `#10B981` | Positive cash flow, income, safe budgets |
| `--color-danger` | `#EF4444` | Negative cash flow, expenses, exceeded budgets |
| `--color-warning` | `#F59E0B` | Near-limit budgets, warnings |
| `--color-text-main` | `#111827` | Primary headings, main numbers, standard text |
| `--color-text-muted` | `#6B7280` | Dates, secondary labels, table headers |

### 2.2 Typography
- **Primary Font (UI):** `Inter`, `system-ui`, `-apple-system`, `sans-serif`
- **Numeric Font (Data):** `JetBrains Mono`, `Fira Code`, or `Courier New`

**Rules:**
- All currency amounts MUST use the numeric monospace font to align vertically.
- KPIs (Total Balance) should be large (24px - 32px) and bold (600 - 700).
- Secondary labels should be small (12px - 14px) and muted.

### 2.3 Borders and Shadows
- **Cards & Widgets:**
  ```css
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  ```
- No heavy dropshadows. Rely on the subtle 1px border to separate widgets.

---

## 3. Layout System

### 3.1 Widget Dashboard
The dashboard uses a CSS Grid layout (typically 12 columns).
- Widgets are independent cards.
- **Top Row:** Small KPI cards (Net Worth, Total Income, Total Expenses).
- **Middle Row:** Large Chart (Cash flow Area Chart or Sankey) taking up 8 columns; Budget Summary taking up 4 columns.
- **Bottom Row:** Recent Transactions (list) and Goals.

### 3.2 Navigation
- Left sidebar or Top navbar.
- Active items use `--color-primary` (`#FF5A36`) as text color or bottom border.
- Inactive items use `--color-text-muted`.

---

## 4. Component-Level Rules

### 4.1 Transactions Table
The most critical UI component. It must look clean, not like an Excel spreadsheet.

**Style Rules:**
- NO vertical borders.
- Only thin horizontal borders (`1px solid var(--color-border)`) between rows.
- **Date Grouping:** Group transactions by date. The date row should have a light gray background (`#F3F4F6`) or just bold text without a border.
- **Amounts:** Right-aligned. Income is `+ $100.00` (Green). Expense is `$50.00` (Dark Gray/Black, no minus sign needed if context is clear, but red is acceptable if emphasizing loss).
- **Icons:** Use small rounded colored icons for categories (e.g., 🛒 for Groceries, 🍔 for Food).

### 4.2 Budget Progress Bars
Instead of just numbers, budgets MUST display a visual progress bar.

**Anatomy:**
1. Category Name (Left) & Budget Amount (Right).
2. A background track: `height: 8px; border-radius: 4px; background: #E5E7EB;`
3. A fill bar: `height: 100%; border-radius: 4px;`
   - `width: (Spent / Budget) * 100%`
   - **Color logic:**
     - `< 80%`: `--color-success` (Green)
     - `80% - 99%`: `--color-warning` (Yellow)
     - `> 100%`: `--color-danger` (Red)

### 4.3 Charts
- **Donut Charts (Reports):** Use thick strokes, clear colors. Put the "Total Amount" centered inside the donut hole.
- **Area Charts (Cash Flow):** X-axis is time. Y-axis is amount. Fill area with a very light opacity of the line color.

### 4.4 Buttons
- **Primary:** `background: var(--color-primary); color: white; border-radius: 8px; font-weight: 500; padding: 8px 16px; border: none;`
- **Secondary:** `background: transparent; color: var(--color-text-main); border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 16px;`

---

## 5. Implementation Notes

1. **CSS Modules / Vanilla CSS:** Build these components using standard CSS. If Tailwind is needed later, the CSS variable tokens map perfectly to `tailwind.config.js`.
2. **Recharts:** Recommended for building the Donut and Area charts.
3. **Responsive:** Ensure the widget grid collapses to a single column on mobile screens. Table rows should convert to stacked cards on very small screens.
