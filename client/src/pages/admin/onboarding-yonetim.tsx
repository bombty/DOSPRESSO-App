// ═══════════════════════════════════════════════════════════════════
// Sprint 47.2 (Aslan 13 May 2026) — Re-Onboarding Admin Panel
// ═══════════════════════════════════════════════════════════════════
// Admin için: işten ayrılan rol'ün yerine gelen yeni kişiye sıfırdan
// onboarding tetiklemek için.
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw, Search, Bot, CheckCircle2, AlertCircle } from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  onboardingComplete: boolean;
  email?: string;
  branchId?: number;
  isActive: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  cgo: "CGO",
  satinalma: "Satın Alma",
  gida_muhendisi: "Gıda Mühendisi",
  coach: "Coach",
  trainer: "Eğitmen",
  fabrika_mudur: "Fabrika Müdürü",
  mudur: "Şube Müdürü",
  supervisor: "Supervisor",
  supervisor_buddy: "Supervisor Buddy",
  barista: "Barista",
  bar_buddy: "Bar Buddy",
};

export default function OnboardingYonetim() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetReason, setResetReason] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Kullanıcı listesi
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error("Kullanıcı seçilmedi");
      const res = await apiRequest("POST", `/api/onboarding/reset/${selectedUser.id}`, {
        reason: resetReason || "Admin sıfırladı",
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Onboarding sıfırlandı",
        description: data.message,
      });
      setShowResetDialog(false);
      setSelectedUser(null);
      setResetReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (err: any) => {
      toast({
        title: "Sıfırlama başarısız",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = (users || []).filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" />
          Onboarding Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Yeni kullanıcılara veya eski rolün yerine gelen yeni kişiye Mr. Dobody onboarding sıfırlama
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            Ne zaman kullanılmalı?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>• <strong>Yeni kullanıcı eklenince</strong> — otomatik onboarding tetiklenmiş olmalı</p>
          <p>• <strong>İşten çıkış</strong> — eski Samet ayrıldı, yeni Samet işe başladı</p>
          <p>• <strong>Rol değişikliği</strong> — barista → supervisor terfi, sistem değişiyor</p>
          <p>• <strong>Onboarding tekrar gerekiyorsa</strong> — sistem güncellendi, kullanıcı yeniden öğrensin</p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Kullanıcı ara (isim, kullanıcı adı, rol)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-users"
        />
      </div>

      {/* User List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Kullanıcılar ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Kullanıcı bulunamadı</div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors"
                  data-testid={`user-row-${user.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">
                        {user.firstName} {user.lastName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      {user.onboardingComplete ? (
                        <Badge variant="default" className="text-xs bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Onboarding ✓
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          ⏳ Bekliyor
                        </Badge>
                      )}
                      {!user.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          Pasif
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      @{user.username}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowResetDialog(true);
                    }}
                    data-testid={`btn-reset-${user.id}`}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Sıfırla
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-600" />
              Onboarding'i Sıfırla
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({ROLE_LABELS[selectedUser.role] || selectedUser.role}) için onboarding sıfırlanacak.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-md p-3 text-sm space-y-1">
              <p className="font-medium">⚠️ Bu işlem:</p>
              <ul className="list-disc pl-5 text-xs space-y-0.5">
                <li>Önceki onboarding kayıtlarını arşivler</li>
                <li>Kullanıcı bir sonraki girişte Mr. Dobody karşılayacak</li>
                <li>Audit log kaydı oluşturulur</li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-medium">Sebep (opsiyonel)</label>
              <Textarea
                placeholder="Örn: Yeni çalışan göreve başladı, eski rol ayrıldı..."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                className="mt-1"
                rows={2}
                data-testid="input-reset-reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="btn-confirm-reset"
            >
              {resetMutation.isPending ? "Sıfırlanıyor..." : "Onboarding'i Sıfırla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
