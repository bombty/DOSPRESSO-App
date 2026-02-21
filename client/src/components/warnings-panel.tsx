import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertTriangle, ShieldAlert, Info, ChevronRight, Loader2, Shield
} from "lucide-react";

interface RuleIssue {
  ruleId: number;
  ruleName: string;
  severity: string;
  entityType: string;
  message: string;
  evidence: Record<string, any>;
  suggestion: string;
}

const severityConfig: Record<string, {
  icon: any;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  color: string;
}> = {
  block: { icon: ShieldAlert, label: "Engel", variant: "destructive", color: "text-red-600" },
  warn: { icon: AlertTriangle, label: "Uyarı", variant: "secondary", color: "text-yellow-600" },
  info: { icon: Info, label: "Bilgi", variant: "outline", color: "text-blue-500" },
};

const entityLabels: Record<string, string> = {
  shift_plan: "Vardiya Planı",
  checklist: "Kontrol Listesi",
  inventory: "Envanter",
  training: "Eğitim",
};

export function WarningsPanel() {
  const { user } = useAuth();
  const [detailIssue, setDetailIssue] = useState<RuleIssue | null>(null);

  const evalUrl = user?.branchId
    ? `/api/ops-rules/evaluate?branchId=${user.branchId}`
    : "/api/ops-rules/evaluate";

  const { data: issues = [], isLoading } = useQuery<RuleIssue[]>({
    queryKey: [evalUrl],
    enabled: !!user,
    refetchInterval: 300000,
  });

  if (!user) return null;
  if (issues.length === 0 && !isLoading) return null;

  const blockIssues = issues.filter(i => i.severity === "block");
  const warnIssues = issues.filter(i => i.severity === "warn");
  const infoIssues = issues.filter(i => i.severity === "info");

  return (
    <>
      <Card data-testid="card-warnings-panel">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-orange-500" />
            Uyarılar & Öneriler
            {issues.length > 0 && (
              <Badge variant={blockIssues.length > 0 ? "destructive" : "secondary"}>
                {issues.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1 flex-wrap">
            {blockIssues.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {blockIssues.length} Engel
              </Badge>
            )}
            {warnIssues.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {warnIssues.length} Uyarı
              </Badge>
            )}
            {infoIssues.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {infoIssues.length} Bilgi
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue, idx) => {
                const config = severityConfig[issue.severity] || severityConfig.info;
                const SevIcon = config.icon;

                return (
                  <div
                    key={`${issue.ruleId}-${idx}`}
                    className="flex items-center gap-3 p-3 rounded-md border hover-elevate cursor-pointer"
                    onClick={() => setDetailIssue(issue)}
                    data-testid={`warning-item-${issue.ruleId}-${idx}`}
                  >
                    <div className={`flex-shrink-0 p-2 rounded-md bg-muted/50`}>
                      <SevIcon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{issue.message}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant={config.variant} className="text-[10px]">
                          {config.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {entityLabels[issue.entityType] || issue.entityType}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid={`button-warning-detail-${issue.ruleId}-${idx}`}
                    >
                      Detay
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailIssue} onOpenChange={(v) => !v && setDetailIssue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailIssue && (() => {
                const config = severityConfig[detailIssue.severity] || severityConfig.info;
                const SevIcon = config.icon;
                return <SevIcon className={`h-5 w-5 ${config.color}`} />;
              })()}
              {detailIssue?.ruleName}
            </DialogTitle>
            <DialogDescription>{detailIssue?.message}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Kural Detayı</h4>
              <p className="text-sm text-muted-foreground">{detailIssue?.message}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-1">Önerilen Çözüm</h4>
              <p className="text-sm text-muted-foreground">{detailIssue?.suggestion}</p>
            </div>

            {detailIssue?.evidence && Object.keys(detailIssue.evidence).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Kanıt Bilgisi</h4>
                <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                  {Object.entries(detailIssue.evidence).map(([key, val]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium text-muted-foreground">{key}:</span>
                      <span>{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Badge variant={
                (severityConfig[detailIssue?.severity || "info"] || severityConfig.info).variant
              }>
                {(severityConfig[detailIssue?.severity || "info"] || severityConfig.info).label}
              </Badge>
              <Badge variant="outline">
                {entityLabels[detailIssue?.entityType || ""] || detailIssue?.entityType}
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailIssue(null)} data-testid="button-close-warning-detail">
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
