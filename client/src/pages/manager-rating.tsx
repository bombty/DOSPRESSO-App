/**
 * Sprint 12 (5 May 2026) - Yönetici Değerlendirme Sayfası
 * 
 * Aslan'ın talebi:
 *   "Yönetici Değerlendirmesi 20 puan" hep 0 görünüyor.
 *   Yöneticinin alt-elemanlarını manuel puanlaması için UI gerekli.
 * 
 * Kullanım:
 *   - Yönetici (manager/supervisor/fabrika_mudur/HQ) sayfa açar
 *   - Şubesindeki personel listesi görünür
 *   - Her birine 0-100 arası puan verir
 *   - Kayıt anında DB'ye yansır (monthlyEmployeePerformance.managerRatingScore)
 *   - Performans skor hesaplaması bunu otomatik kullanır (Sprint 10)
 * 
 * Yetki: manager, supervisor, fabrika_mudur, admin, ceo, cgo
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Save, AlertTriangle, TrendingUp, History, Users } from "lucide-react";

const MANAGER_ROLES = ['manager', 'supervisor', 'fabrika_mudur', 'admin', 'ceo', 'cgo'];

interface TeamMember {
  userId: string;
  fullName: string;
  role: string;
  currentRating: number | null;
  ratingDate: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  barista: 'Barista',
  bar_buddy: 'Bar Buddy',
  supervisor_buddy: 'Supervisor Buddy',
  stajyer: 'Stajyer',
  fabrika_personel: 'Fabrika Personeli',
  fabrika_operator: 'Fabrika Operatörü',
};

export default function ManagerRating() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = user?.role && MANAGER_ROLES.includes(user.role);
  const isHQ = user?.role && ['admin', 'ceo', 'cgo'].includes(user.role);

  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [ratingMember, setRatingMember] = useState<TeamMember | null>(null);
  const [scoreValue, setScoreValue] = useState<number>(70);
  const [scoreNotes, setScoreNotes] = useState<string>('');

  // HQ için branch listesi
  const { data: branches } = useQuery<any[]>({
    queryKey: ['/api/branches'],
    enabled: !!isHQ,
  });

  useEffect(() => {
    if (isHQ && branches?.length && !selectedBranchId) {
      // Pilot şubelerden ilki
      const pilot = branches.find((b: any) => [5, 8, 23, 24].includes(b.id) && b.isActive);
      if (pilot) setSelectedBranchId(pilot.id);
    } else if (!isHQ && user?.branchId && !selectedBranchId) {
      setSelectedBranchId(user.branchId);
    }
  }, [isHQ, branches, user, selectedBranchId]);

  // Takım listesi
  const { data, isLoading, refetch } = useQuery<{ team: TeamMember[]; period: any; branchId: number }>({
    queryKey: ['/api/manager-rating/team', selectedBranchId],
    queryFn: async () => {
      const params = isHQ && selectedBranchId ? `?branchId=${selectedBranchId}` : '';
      const res = await fetch(`/api/manager-rating/team${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Takım yüklenemedi');
      return res.json();
    },
    enabled: !!isManager && !!selectedBranchId,
  });

  const team = data?.team || [];
  const period = data?.period;

  const ratingMutation = useMutation({
    mutationFn: ({ userId, score, notes }: any) =>
      apiRequest('PUT', `/api/manager-rating/${userId}`, { score, notes }),
    onSuccess: () => {
      toast({ title: '✓ Puan kaydedildi', description: 'Performans skoru otomatik güncellendi' });
      queryClient.invalidateQueries({ queryKey: ['/api/manager-rating/team'] });
      queryClient.invalidateQueries({ queryKey: ['/api/performance/personnel'] });
      setRatingMember(null);
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  if (!isManager) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-bold">Yetki Yok</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Bu sayfa <strong>yönetici (manager/supervisor/fabrika müdürü/HQ)</strong> için.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4 pb-20">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Yönetici Değerlendirme
              </CardTitle>
              <CardDescription>
                {period && `${months[period.month - 1]} ${period.year} dönemi`} · 
                Personel performansını puanla (0-100)
              </CardDescription>
            </div>
            {isHQ && (
              <Select 
                value={selectedBranchId ? String(selectedBranchId) : ''} 
                onValueChange={(v) => setSelectedBranchId(Number(v))}
              >
                <SelectTrigger className="w-40 text-xs">
                  <SelectValue placeholder="Şube..." />
                </SelectTrigger>
                <SelectContent>
                  {branches?.filter((b: any) => b.isActive).map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Bilgi */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
        <CardContent className="p-3 text-xs">
          <strong>💡 Nasıl Puanlama Yapılır:</strong>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            <li>• 0-30: Kritik düşük (uyarı/disiplin gerekli)</li>
            <li>• 31-50: Düşük (gelişim alanı)</li>
            <li>• 51-70: Orta (standart)</li>
            <li>• 71-85: İyi (övgü/teşvik)</li>
            <li>• 86-100: Mükemmel (örnek personel)</li>
          </ul>
          <p className="mt-2 text-muted-foreground italic">
            Puanınız <strong>monthly_employee_performance.manager_rating_score</strong> alanına yazılır
            ve performans hesaplamasında 20 puan kategorisi olarak kullanılır.
          </p>
        </CardContent>
      </Card>

      {/* Takım Listesi */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
      ) : team.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm">Bu şubede puanlanacak personel yok</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {team.map(m => (
            <Card key={m.userId} data-testid={`rating-card-${m.userId}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{m.fullName}</h3>
                    <Badge variant="outline" className="text-xs mt-1">
                      {ROLE_LABELS[m.role] || m.role}
                    </Badge>
                  </div>
                  <div className="text-right">
                    {m.currentRating != null ? (
                      <>
                        <div className={`text-2xl font-bold ${
                          m.currentRating >= 80 ? 'text-green-600' :
                          m.currentRating >= 50 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {m.currentRating}
                        </div>
                        <div className="text-[10px] text-muted-foreground">/ 100</div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">Henüz puanlanmadı</div>
                    )}
                  </div>
                </div>
                <Button 
                  variant={m.currentRating != null ? 'outline' : 'default'}
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => {
                    setRatingMember(m);
                    setScoreValue(m.currentRating ?? 70);
                    setScoreNotes('');
                  }}
                  data-testid={`button-rate-${m.userId}`}
                >
                  <Star className="h-3 w-3 mr-1" />
                  {m.currentRating != null ? 'Düzenle' : 'Puan Ver'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rating Dialog */}
      <Dialog open={!!ratingMember} onOpenChange={(o) => !o && setRatingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Puan Ver: {ratingMember?.fullName}</DialogTitle>
            <DialogDescription>
              {period && `${months[period.month - 1]} ${period.year} dönemi`} · 0-100 arası puan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Skor görsel */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className={`text-5xl font-bold ${
                scoreValue >= 80 ? 'text-green-600' :
                scoreValue >= 50 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {scoreValue}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {scoreValue >= 86 ? '⭐ Mükemmel' :
                 scoreValue >= 71 ? '✓ İyi' :
                 scoreValue >= 51 ? '· Orta' :
                 scoreValue >= 31 ? '! Düşük' : '⚠ Kritik'}
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <Label className="text-xs">Puan</Label>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[scoreValue]}
                onValueChange={(v) => setScoreValue(v[0])}
                data-testid="slider-score"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            {/* Quick set */}
            <div className="grid grid-cols-5 gap-1">
              {[20, 40, 60, 80, 100].map(v => (
                <Button 
                  key={v} 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => setScoreValue(v)}
                >
                  {v}
                </Button>
              ))}
            </div>

            {/* Notlar */}
            <div>
              <Label className="text-xs">Notlar (opsiyonel)</Label>
              <Textarea 
                value={scoreNotes}
                onChange={(e) => setScoreNotes(e.target.value)}
                placeholder="Bu puanın gerekçesi (geri bildirim için)..."
                rows={2}
                data-testid="textarea-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingMember(null)}>İptal</Button>
            <Button 
              onClick={() => {
                if (ratingMember) {
                  ratingMutation.mutate({ 
                    userId: ratingMember.userId, 
                    score: scoreValue, 
                    notes: scoreNotes 
                  });
                }
              }}
              disabled={ratingMutation.isPending}
              data-testid="button-save-rating"
            >
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
