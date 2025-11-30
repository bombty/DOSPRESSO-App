import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getHeatColor } from "./dashboard-utils";

interface BranchPerformanceHeatmapProps {
  compositeBranchScores: any[];
  isLoading: boolean;
  title?: string;
}

export function BranchPerformanceHeatmap({
  compositeBranchScores,
  isLoading,
  title = "Şube Performans Isı Haritası",
}: BranchPerformanceHeatmapProps) {
  if (isLoading || !compositeBranchScores || compositeBranchScores.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {compositeBranchScores.map((score) => (
            <Tooltip key={score.branchId}>
              <TooltipTrigger asChild>
                <div
                  className={`p-3 rounded-md text-center cursor-pointer transition-all ${getHeatColor(
                    score.compositeScore
                  )} text-white text-xs font-semibold`}
                >
                  <div className="truncate text-xs">{score.branchName.split(' ')[0]}</div>
                  <div className="font-bold">{score.compositeScore.toFixed(0)}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs">
                <div className="font-semibold">{score.branchName}</div>
                <div>Personel: {score.employeePerformanceScore.toFixed(0)}</div>
                <div>Ekipman: {score.equipmentScore.toFixed(0)}</div>
                <div>Kalite: {score.qualityAuditScore.toFixed(0)}</div>
                <div>Müşteri: {score.customerSatisfactionScore.toFixed(0)}</div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>85%+</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-lime-500 rounded"></div>
            <span>75-84%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>65-74%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>50-64%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span>&lt;50%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
