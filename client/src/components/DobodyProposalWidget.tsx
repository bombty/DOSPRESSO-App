import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Bot, Check, X, Clock, AlertTriangle, Info, Zap, ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const priorityConfig: Record<string, { color: string; icon: any }> = {
  acil: { color: "bg-red-500 text-white", icon: AlertTriangle },
  onemli: { color: "bg-amber-500 text-white", icon: Zap },
  bilgi: { color: "bg-blue-500 text-white", icon: Info },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  warning: { label: "Uyarı", color: "text-red-500" },
  action: { label: "Aksiyon", color: "text-amber-500" },
  info: { label: "Bilgi", color: "text-blue-500" },
};

const wfLabels: Record<string, string> = {
  "WF-1": "Denetim", "WF-2": "SLA Takip", "WF-3": "Stok",
  "WF-4": "Eğitim", "WF-5": "Vardiya", "WF-6": "Performans",
  "WF-7": "Proje", "WF-8": "Haftalık Özet",
};

type Proposal = {
  id: number; title: string; description: string | null;
  workflowType: string; proposalType: string; priority: string;
  status: string; branchName: string | null; createdAt: string;
};

export function DobodyProposalWidget({ maxItems = 5 }: { maxItems?: number }) {
  const { toast } = useToast();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: proposals } = useQuery<Proposal[]>({
    queryKey: ["/api/dobody/proposals"],
    refetchInterval: 60000,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/dobody/proposals/count"],
    refetchInterval: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/dobody/proposals"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dobody/proposals/count"] });
  };

  const approveMut = useMutation({
    mutationFn: async (id: number) => (await apiRequest("PATCH", `/api/dobody/proposals/${id}/approve`)).json(),
    onSuccess: () => { invalidate(); toast({ title: "Öneri onaylandı" }); },
  });

  const rejectMut = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      (await apiRequest("PATCH", `/api/dobody/proposals/${id}/reject`, { reason })).json(),
    onSuccess: () => { invalidate(); setRejectId(null); setRejectReason(""); toast({ title: "Öneri reddedildi" }); },
  });

  const pending = proposals?.filter(p => p.status === 'pending') || [];
  const count = countData?.count || pending.length;

  if (count === 0 && (!proposals || proposals.length === 0)) return null;

  return (
    <>
      <Card className="border-purple-200 dark:border-purple-800/50">
        <CardHeader className="bg-[#192838] text-white rounded-t-lg py-2 px-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-300" />
              <span>Mr. Dobody</span>
            </div>
            {count > 0 && <Badge className="bg-red-500 text-white text-xs">{count}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Bekleyen öneri yok</p>
          ) : (
            <div className="divide-y">
              {pending.slice(0, maxItems).map(p => {
                const pri = priorityConfig[p.priority] || priorityConfig.bilgi;
                const PriIcon = pri.icon;
                const typeInfo = typeConfig[p.proposalType] || typeConfig.info;
                const wfLabel = wfLabels[p.workflowType] || p.workflowType;

                return (
                  <div key={p.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge className={`${pri.color} text-[10px] shrink-0`}>
                        <PriIcon className="h-3 w-3 mr-0.5" />{p.priority}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{p.title}</p>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{wfLabel}</span>
                          {p.branchName && <span>· {p.branchName}</span>}
                          <span>· {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: tr })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 justify-end">
                      <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600"
                        onClick={() => { setRejectId(p.id); setRejectReason(""); }}>
                        <X className="h-3 w-3 mr-1" /> Reddet
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => approveMut.mutate(p.id)} disabled={approveMut.isPending}>
                        <Check className="h-3 w-3 mr-1" /> Onayla
                      </Button>
                    </div>
                  </div>
                );
              })}
              {pending.length > maxItems && (
                <div className="p-2 text-center">
                  <span className="text-xs text-muted-foreground">+{pending.length - maxItems} daha</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectId !== null} onOpenChange={open => { if (!open) setRejectId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Öneri Reddi</DialogTitle></DialogHeader>
          <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Red nedeni (opsiyonel)" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectId(null)}>İptal</Button>
            <Button size="sm" variant="destructive"
              onClick={() => rejectId && rejectMut.mutate({ id: rejectId, reason: rejectReason })}>
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
