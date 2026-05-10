/**
 * KVKK Per-User Onay Modal — DB Tabanlı
 *
 * MEVCUT (eski): localStorage tabanlı, cihaza özel
 * YENİ (Aslan 10 May 2026): DB tabanlı, kullanıcıya özel
 *
 * AKIŞ:
 * 1. Kullanıcı PIN ile giriş yapıyor
 * 2. /api/kvkk/my-status → requiresApproval=true mu?
 * 3. Eğer evet → bu modal otomatik açılır
 * 4. Kullanıcı "Anladım, Onaylıyorum" tıklar
 * 5. POST /api/kvkk/approve → audit kayıt
 * 6. Modal kapanır, devam eder
 *
 * Eski KvkkAydinlatma component'i ana giriş ekranı için kalır
 * (sadece bilgilendirme amaçlı, eski uyumluluk için).
 *
 * Aslan 10 May 2026 talebi.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KvkkPerUserModalProps {
  /** Modal'ı açmak için (auto-open için: required) */
  open: boolean;
  /** Onay verildikten sonra çağrılır */
  onApproved?: () => void;
  /** Manuel kapatma (eğer izinli ise) */
  onCancel?: () => void;
  /** 'kiosk_pin' | 'mobile_app' | 'web_dashboard' */
  approvalMethod: "kiosk_pin" | "mobile_app" | "web_dashboard";
  /** Şube bağlamı (kiosk için) */
  branchId?: string;
  /** Onay verilmeden kapatılamasın mı? (true: zorunlu) */
  required?: boolean;
}

export function KvkkPerUserModal({
  open,
  onApproved,
  onCancel,
  approvalMethod,
  branchId,
  required = true,
}: KvkkPerUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // Aktif policy
  const { data: policy, isLoading } = useQuery<any>({
    queryKey: ["/api/kvkk/policy/active"],
    queryFn: async () => {
      const r = await fetch("/api/kvkk/policy/active");
      if (!r.ok) throw new Error("Policy alınamadı");
      return r.json();
    },
    enabled: open,
  });

  // Onay mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!policy) throw new Error("Policy yok");
      const r = await fetch("/api/kvkk/approve", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyVersionId: policy.id,
          approvalMethod,
          branchId: branchId || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Onay kaydedilemedi");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kvkk/my-status"] });
      toast({
        title: "✅ Onayınız kaydedildi",
        description: `KVKK ${policy?.version || "v1.0"} onaylandı`,
      });
      onApproved?.();
    },
    onError: (e: any) => {
      toast({
        title: "❌ Hata",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  // Scroll'u takip et — sona kaydırınca onay aktif
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const reachedBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    if (reachedBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !required) onCancel?.();
      }}
    >
      <DialogContent
        className="max-w-3xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => required && e.preventDefault()}
        onEscapeKeyDown={(e) => required && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            KVKK Aydınlatma Metni
            {policy && (
              <span className="text-xs font-normal text-gray-500 ml-2">
                {policy.version}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            6698 sayılı KVKK gereği kişisel verilerinizin işlenmesi hakkında
            bilgilendirme. <b>Lütfen sona kadar okuyun.</b>
          </DialogDescription>
        </DialogHeader>

        {/* İçerik — Scroll edilebilir */}
        <div
          className="flex-1 overflow-y-auto border rounded-md p-4 bg-gray-50 dark:bg-gray-900"
          onScroll={handleScroll}
        >
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : policy ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: convertMarkdownToHtml(policy.contentMarkdown),
              }}
            />
          ) : (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="w-5 h-5" />
              <span>KVKK metni yüklenemedi</span>
            </div>
          )}
        </div>

        {/* Scroll uyarısı */}
        {!hasScrolledToBottom && policy && (
          <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Lütfen metni sona kadar kaydırın (onay butonu açılacak)
          </div>
        )}
        {hasScrolledToBottom && (
          <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Tamam, metin sona kadar okundu
          </div>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          {!required && (
            <Button variant="outline" onClick={onCancel}>
              İptal
            </Button>
          )}
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={
              !hasScrolledToBottom ||
              approveMutation.isPending ||
              !policy
            }
            className="bg-[#C0392B] hover:bg-[#A0322B] gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {approveMutation.isPending
              ? "Kaydediliyor..."
              : "Anladım, Onaylıyorum"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Yardımcı: Basit Markdown → HTML
// ═══════════════════════════════════════════════════════════════════

function convertMarkdownToHtml(md: string): string {
  return md
    // Başlıklar
    .replace(/^### (.+)$/gm, "<h3 class='font-bold text-lg mt-3 mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='font-bold text-xl mt-4 mb-2'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='font-bold text-2xl mt-4 mb-2'>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Liste maddesi
    .replace(/^- (.+)$/gm, "<li class='ml-4'>• $1</li>")
    // Yatay çizgi
    .replace(/^---+$/gm, "<hr class='my-2'/>")
    // Paragraflar
    .split("\n\n")
    .map((p) => (p.trim() && !p.startsWith("<") ? `<p class='mb-2'>${p}</p>` : p))
    .join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// useKvkkRequired Hook — Otomatik kontrol
// ═══════════════════════════════════════════════════════════════════
//
// Sayfa içinde:
//   const { requiresApproval, isLoading } = useKvkkRequired();
//
// Kullanıcı onaylanmadıysa requiresApproval=true gelir.

export function useKvkkRequired() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/kvkk/my-status"],
    queryFn: async () => {
      const r = await fetch("/api/kvkk/my-status", {
        credentials: "include",
      });
      if (!r.ok) {
        if (r.status === 401) return { requiresApproval: false };
        throw new Error("Status alınamadı");
      }
      return r.json();
    },
    staleTime: 60000, // 1 dakika cache
    retry: false,
  });

  return {
    requiresApproval: data?.requiresApproval || false,
    activePolicy: data?.activePolicy || null,
    lastApproval: data?.lastApproval || null,
    isLoading,
  };
}
