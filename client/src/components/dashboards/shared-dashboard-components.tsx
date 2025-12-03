import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LucideIcon } from "lucide-react";
import { getGaugeColor, getGaugeTextColor, getColorClass } from "./dashboard-utils";

interface GaugeCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  suffix?: string;
}

export function GaugeCard({ label, value, icon: Icon, suffix = '%' }: GaugeCardProps) {
  return (
    <Card>
      <CardContent className="pt-1.5 pb-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold">{label}</span>
          <Icon className={`h-2.5 w-2.5 ${getGaugeTextColor(value)}`} />
        </div>
        <div className={`text-base font-bold ${getGaugeTextColor(value)}`}>
          {value}{suffix}
        </div>
        {suffix === '%' && <Progress value={value} className="h-1" />}
      </CardContent>
    </Card>
  );
}

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color?: 'blue' | 'red' | 'green' | 'amber' | 'yellow' | 'orange' | 'purple';
  suffix?: string;
  onClick?: () => void;
  testId?: string;
}

export function KPICard({ icon: Icon, label, value, color = 'blue', suffix = '', onClick, testId }: KPICardProps) {
  const colorMap: Record<string, string> = {
    blue: 'border-l-blue-600',
    red: 'border-l-red-600',
    green: 'border-l-green-600',
    amber: 'border-l-amber-600',
    yellow: 'border-l-yellow-600',
    orange: 'border-l-orange-600',
    purple: 'border-l-purple-600',
  };

  const textColorMap: Record<string, string> = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
  };

  const boldTextColorMap: Record<string, string> = {
    blue: 'text-blue-700',
    red: 'text-red-700',
    green: 'text-green-700',
    amber: 'text-amber-700',
    yellow: 'text-yellow-700',
    orange: 'text-orange-700',
    purple: 'text-purple-700',
  };

  return (
    <Card 
      className={`border-l-4 ${colorMap[color]} ${onClick ? 'cursor-pointer hover-elevate' : ''}`}
      onClick={onClick}
      data-testid={testId}
    >
      <CardContent className="pt-1.5 pb-1.5 text-center">
        <div className="flex justify-center mb-0.5">
          <Icon className={`h-3.5 w-3.5 ${textColorMap[color]}`} />
        </div>
        <div className={`text-sm font-bold ${boldTextColorMap[color]}`}>
          {value}{suffix}
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

interface PerformanceRowProps {
  name: string;
  score: number;
  onClick?: () => void;
  testId?: string;
}

export function PerformanceRow({ name, score, onClick, testId }: PerformanceRowProps) {
  return (
    <div 
      className={`flex items-center justify-between p-2 bg-muted/50 rounded gap-2 ${onClick ? 'cursor-pointer hover-elevate' : ''}`}
      onClick={onClick}
      data-testid={testId}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-blue-600">{name}</p>
        <div className="w-full bg-secondary/20 rounded-full h-1.5 mt-1">
          <div
            className={`h-1.5 rounded-full ${
              score >= 80 ? 'bg-green-600' : score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
            }`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>
      <Badge variant={score >= 80 ? "default" : "secondary"} className="flex-shrink-0">
        {score.toFixed(0)}
      </Badge>
    </div>
  );
}
