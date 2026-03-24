import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import EmptyStateCard from "./EmptyStateCard";
import { TrendingUp } from "lucide-react";

interface TrendChartProps {
  title: string;
  data: Array<Record<string, any>>;
  xKey: string;
  lines?: Array<{ key: string; color: string; name: string }>;
  bars?: Array<{ key: string; color: string; name: string }>;
  type?: "line" | "bar";
  height?: number;
  className?: string;
}

export default function TrendChart({
  title,
  data,
  xKey,
  lines,
  bars,
  type = "line",
  height = 200,
  className,
}: TrendChartProps) {
  const hasData = data.length > 0 && data.some((d) => {
    const keys = [...(lines || []).map((l) => l.key), ...(bars || []).map((b) => b.key)];
    return keys.some((k) => d[k] !== null && d[k] !== undefined && d[k] !== 0);
  });

  if (!hasData) {
    return (
      <EmptyStateCard
        icon={<TrendingUp className="h-10 w-10" />}
        title={title}
        description="Trend verisi henüz oluşmadı"
        className={className}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {(lines || []).map((l) => (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  stroke={l.color}
                  name={l.name}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {(bars || []).map((b) => (
                <Bar key={b.key} dataKey={b.key} fill={b.color} name={b.name} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
