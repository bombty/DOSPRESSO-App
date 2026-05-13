// ═══════════════════════════════════════════════════════════════════
// Sprint 48 (Aslan 13 May 2026) — Daily Brief Card
// ═══════════════════════════════════════════════════════════════════
// Kullanıcı dashboard'unda günün AI brief'ini gösterir.
// Faydalı/değil reaction + tıklama tracking.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface PriorityItem {
  type: "warning" | "info" | "success";
  text: string;
  actionUrl?: string;
}

interface DailyBrief {
  id: number;
  userId: string;
  role: string;
  briefDate: string;
  content: string;
  summary: string;
  priorityItems: PriorityItem[];
  viewed: boolean;
  reaction?: "helpful" | "not_helpful" | null;
}

export function DailyBriefCard({ compact = false }: { compact?: boolean }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading } = useQuery<{ brief: DailyBrief | null; hasContent: boolean }>({
    queryKey: ["/api/daily-briefs/today"],
    staleTime: 5 * 60 * 1000, // 5 dk
  });

  const brief = data?.brief;

  // İlk görüşte view kayıt
  const viewMutation = useMutation({
    mutationFn: async (briefId: number) => {
      await apiRequest("POST", `/api/daily-briefs/${briefId}/view`, {});
    },
  });

  useEffect(() => {
    if (brief && !brief.viewed) {
      viewMutation.mutate(brief.id);
    }
  }, [brief?.id, brief?.viewed]);

  const reactionMutation = useMutation({
    mutationFn: async ({ briefId, reaction }: { briefId: number; reaction: "helpful" | "not_helpful" }) => {
      await apiRequest("POST", `/api/daily-briefs/${briefId}/reaction`, { reaction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-briefs/today"] });
    },
  });

  const clickMutation = useMutation({
    mutationFn: async ({ briefId, itemIndex, actionUrl }: { briefId: number; itemIndex: number; actionUrl: string }) => {
      await apiRequest("POST", `/api/daily-briefs/${briefId}/click`, { itemIndex, actionUrl });
    },
  });

  const handleItemClick = (item: PriorityItem, index: number) => {
    if (item.actionUrl && item.actionUrl !== "null" && item.actionUrl !== "" && brief) {
      clickMutation.mutate({ briefId: brief.id, itemIndex: index, actionUrl: item.actionUrl });
      setLocation(item.actionUrl);
    }
  };

  if (dismissed) return null;

  if (isLoading) {
    return (
      <Card className="border-blue-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Mr. Dobody günün brief'ini hazırlıyor...</p>
        </CardContent>
      </Card>
    );
  }

  if (!brief || !data?.hasContent) {
    return null; // Brief yok, kart gösterme
  }

  // Icon map
  const iconFor = (type: string) => {
    if (type === "warning") return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    if (type === "success") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    return <Info className="w-4 h-4 text-blue-600" />;
  };

  const colorFor = (type: string) => {
    if (type === "warning") return "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20";
    if (type === "success") return "border-green-200 bg-green-50/50 dark:bg-green-950/20";
    return "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20";
  };

  // Compact: sadece summary
  if (compact) {
    return (
      <Card
        className="border-blue-200/50 bg-gradient-to-r from-blue-50/30 to-purple-50/30 dark:from-blue-950/20 dark:to-purple-950/20 cursor-pointer hover:border-blue-300"
        onClick={() => setLocation("/dashboard")}
        data-testid="daily-brief-compact"
      >
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Günün Brief'i
              </p>
              <p className="text-sm font-medium truncate">{brief.summary}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Full görünüm
  return (
    <Card className="border-blue-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-2 border-b border-blue-200/40">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Mr. Dobody</h3>
                <Badge variant="outline" className="text-xs h-5">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                  AI Brief
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{brief.summary}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 flex-shrink-0"
            onClick={() => setDismissed(true)}
            data-testid="btn-dismiss-brief"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content - markdown-style */}
        <div className="p-4 pt-3">
          <div className="text-sm whitespace-pre-wrap text-foreground/90 mb-3" data-testid="brief-content">
            {brief.content}
          </div>

          {/* Priority Items - tıklanabilir */}
          {brief.priorityItems && brief.priorityItems.length > 0 && (
            <div className="space-y-2 mt-3">
              {brief.priorityItems.map((item, idx) => {
                const hasValidUrl = item.actionUrl && item.actionUrl !== "null" && item.actionUrl !== "";
                return (
                  <button
                    key={idx}
                    onClick={() => handleItemClick(item, idx)}
                    disabled={!hasValidUrl}
                    className={`w-full text-left rounded-md border p-2.5 flex items-start gap-2 transition-colors ${
                      colorFor(item.type)
                    } ${hasValidUrl ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
                    data-testid={`priority-item-${idx}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">{iconFor(item.type)}</div>
                    <p className="text-sm flex-1">{item.text}</p>
                    {hasValidUrl && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Reaction */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-200/40">
            <p className="text-xs text-muted-foreground">Bu brief faydalı mıydı?</p>
            <div className="flex gap-1">
              <Button
                variant={brief.reaction === "helpful" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => reactionMutation.mutate({ briefId: brief.id, reaction: "helpful" })}
                data-testid="btn-reaction-helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={brief.reaction === "not_helpful" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => reactionMutation.mutate({ briefId: brief.id, reaction: "not_helpful" })}
                data-testid="btn-reaction-not-helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
