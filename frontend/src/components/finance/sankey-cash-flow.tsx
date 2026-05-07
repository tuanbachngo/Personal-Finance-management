"use client";

import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

type SankeyNode = {
  name: string;
  color?: string;
  displayValue?: number; // ghi đè giá trị hiển thị (thay vì dùng auto-calculated flow)
};

type SankeyLink = {
  source: number;
  target: number;
  value: number;
};

type Props = {
  data: {
    nodes: SankeyNode[];
    links: SankeyLink[];
  };
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function hasEnoughFlowData(data: Props["data"]): boolean {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
    return false;
  }

  const positiveLinks = data.links.filter((link) => Number(link.value) > 0);
  const expenseLinks = positiveLinks.filter((link) => Number(link.target) >= 2);

  if (data.nodes.length < 3) return false;
  if (positiveLinks.length < 1) return false;
  if (expenseLinks.length < 1) return false;

  return true;
}

function NotEnoughDataState() {
  return (
    <div className="h-[500px] w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold tracking-tight text-text">
        Dòng tiền
      </h2>

      <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg/40">
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative opacity-40"
          >
            <path
              d="M24 72V38C24 24.745 34.745 14 48 14C61.255 14 72 24.745 72 38V72C72 77.523 67.523 82 62 82C58.8 82 55.909 80.474 54.089 78.064C51.259 82.047 44.741 82.047 41.911 78.064C40.091 80.474 37.2 82 34 82C28.477 82 24 77.523 24 72Z"
              fill="currentColor"
              className="text-muted"
            />
            <circle cx="40" cy="42" r="4" fill="white" />
            <circle cx="56" cy="42" r="4" fill="white" />
            <path
              d="M40 58C44.5 61 51.5 61 56 58"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-base font-semibold text-text">Chưa đủ dữ liệu</p>
        <p className="mt-2 max-w-md text-center text-sm text-muted">
          Hãy chọn khoảng thời gian dài hơn hoặc thêm giao dịch thu/chi để tạo biểu đồ dòng tiền có ý nghĩa.
        </p>
      </div>
    </div>
  );
}

const CustomNode = ({
  x,
  y,
  width,
  height,
  payload,
  containerWidth,
}: any) => {
  const isOut = x + width + 120 > containerWidth;
  // Dùng displayValue nếu được truyền, ngược lại dùng value tự tính của Recharts
  const displayVal = payload.displayValue ?? payload.value ?? 0;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color || "#94A3B8"}
        fillOpacity={1}
        rx={3}
        ry={3}
      />

      <text
        x={isOut ? x - 8 : x + width + 8}
        y={y + height / 2 - 8}
        textAnchor={isOut ? "end" : "start"}
        dominantBaseline="middle"
        fontSize="13"
        fontWeight="700"
        fill="#374151"
      >
        {payload.name}
      </text>

      <text
        x={isOut ? x - 8 : x + width + 8}
        y={y + height / 2 + 10}
        textAnchor={isOut ? "end" : "start"}
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="500"
        fill="#6B7280"
      >
        {formatNumber(Number(displayVal))}
      </text>
    </g>
  );
};

const CustomLink = (props: any) => {
  const {
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    index,
    payload,
  } = props;

  const gradientId = `cashFlowLinkGradient${index}`;

  const sourceColor =
    payload?.source?.color ||
    payload?.source?.payload?.color ||
    "#94A3B8";

  const targetColor =
    payload?.target?.color ||
    payload?.target?.payload?.color ||
    "#94A3B8";

  return (
    <g>
      <defs>
        <linearGradient
          id={gradientId}
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={sourceColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={targetColor} stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={Math.max(1, linkWidth)}
        opacity={0.9}
      />
    </g>
  );
};

export function SankeyCashFlow({ data }: Props) {
  const positiveData = {
    nodes: data?.nodes || [],
    links: (data?.links || []).filter((link) => Number(link.value) > 0),
  };

  if (!hasEnoughFlowData(positiveData)) {
    return <NotEnoughDataState />;
  }

  return (
    <div className="h-[750px] w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold tracking-tight text-text">
        Dòng tiền
      </h2>

      <div className="h-[600px] w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={positiveData}
            node={<CustomNode />}
            link={<CustomLink />}
            nodePadding={20}
            nodeWidth={16}
            margin={{ left: 8, right: 200, top: 32, bottom: 32 }}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                color: "#111827",
              }}
              formatter={(value) => formatNumber(Number(value))}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
