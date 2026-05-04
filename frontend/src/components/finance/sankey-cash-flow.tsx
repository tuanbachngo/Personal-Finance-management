"use client";

import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

type SankeyNode = { name: string; color?: string };
type SankeyLink = { source: number; target: number; value: number };

type Props = {
  data: {
    nodes: SankeyNode[];
    links: SankeyLink[];
  };
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(value);
}

const CustomNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
  const isOut = x + width + 10 > containerWidth;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={payload.color || "#8884d8"} fillOpacity={1} rx={2} ry={2} />
      <text
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 - 8}
        textAnchor={isOut ? "end" : "start"}
        dominantBaseline="middle"
        fontSize="13"
        fontWeight="600"
        fill="#374151"
      >
        {payload.name}
      </text>
      <text
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 10}
        textAnchor={isOut ? "end" : "start"}
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="500"
        fill="#6B7280"
      >
        {formatNumber(payload.value)}
      </text>
    </g>
  );
};

const CustomLink = (props: any) => {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props;
  const gradientId = `linkGradient${index}`;
  
  // Safely extract colors. Recharts might nest this in payload or directly on the link node
  const sourceColor = payload?.source?.color || payload?.source?.payload?.color || "#cbd5e1";
  const targetColor = payload?.target?.color || payload?.target?.payload?.color || "#cbd5e1";
  
  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={sourceColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={targetColor} stopOpacity="0.4" />
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
        opacity={0.8}
        className="transition-opacity duration-300 hover:opacity-100"
      />
    </g>
  );
};

export function SankeyCashFlow({ data }: Props) {
  if (!data || !data.nodes || data.nodes.length === 0 || !data.links || data.links.length === 0) {
    return (
      <div className="h-[500px] w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold tracking-tight text-text">Cash Flow</h2>
        <div className="flex h-[400px] items-center justify-center">
          <p className="text-sm text-muted">No data available for cash flow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold tracking-tight text-text">Cash Flow</h2>
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={data}
            node={<CustomNode />}
            link={<CustomLink />}
            nodePadding={40}
            margin={{ left: 10, right: 150, top: 20, bottom: 20 }}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                color: "#111827"
              }}
              formatter={(value: number) => formatNumber(value)}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
