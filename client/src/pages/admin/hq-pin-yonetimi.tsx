/**
 * Sprint 10 P-7 — HQ Kiosk PIN Yönetimi (Admin)
 * 
 * Pilot 18 May öncesi keşif: HQ users 19/19 phone_number = NULL.
 * branchStaffPins'ta zaten 19 bcrypt PIN var ama kimse PIN'lerini bilmiyor.
 * 
 * Bu sayfa Aslan'a (admin/CEO) tek ekrandan PIN reset imkanı verir.
 * Mobile-first (iPad), Türkçe UI, kopyalanabilir PIN listesi.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Key,
  AlertTriangle,
  CheckCircle,
  Copy,
  Save,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';

interface HQUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string | null;
  phoneNumber: string | null;
  hasPin: boolean;
  pinUpdatedAt: string | null;
  phoneFallbackPossible: boolean;
}

interface ApiResponse {
  users: HQUser[];
  total: number;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '🔧 Admin',
  ceo: '👑 CEO',
  cgo: '🎯 CGO',
  ceo_observer: '👁️ CEO Observer',
  muhasebe_ik: '📊 Muhasebe/İK',
  satinalma: '🛒 Satın Alma',
  kalite_kontrol: '✅ Kalite Kontrol',
  marketing: '📢 Marketing',
  teknik: '🔌 Teknik',
  trainer: '🎓 Trainer',
  coach: '⚽ Coach',
  destek: '🤝 Destek',
  yatirimci_hq: '💼 Yatırımcı HQ',
};

export default function AdminHqPinYonetimi() {
  const { toast } = useToast();
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ['/api/admin/hq-users-pin-status'],
  });

  const resetSinglePinMutation = useMutation({
    mutationFn: async ({ userId, pin }: { userId: string; pin: string }) => {
      return apiRequest(`/api/admin/hq-users/${userId}/reset-pin`, {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
    },
    onSuccess: (_data, variables) => {
      toast({
        title: '✅ PIN sıfırlandı',
        description: `Kullanıcı yeni PIN ile giriş yapabilir.`,
      });
      // Input temizleme
      setPinInputs((prev) => {
        const copy = { ...prev };
        delete copy[variables.userId];
        return copy;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/hq-users-pin-status'] });
    },
    onError: (err: any) => {
      toast({
        title: '❌ Hata',
        description: err?.message || 'PIN sıfırlanamadı',
        variant: 'destructive',
      });
    },
  });

  const bulkResetMutation = useMutation({
    mutationFn: async (resets: Array<{ userId: string; pin: string }>) => {
      return apiRequest('/api/admin/hq-users/bulk-pin-reset', {
        method: 'POST',
        body: JSON.stringify({ resets }),
      });
    },
    onSuccess: (resp: any) => {
      toast({
        title: '✅ Toplu reset tamamlandı',
        description: `${resp.results?.length || 0} kullanıcının PIN'i sıfırlandı.`,
      });
      setPinInputs({});
      queryClient.invalidateQueries({ queryKey: ['/api/admin/hq-users-pin-status'] });
    },
    onError: (err: any) => {
      toast({
        title: '❌ Hata',
        description: err?.message || 'Toplu reset başarısız',
        variant: 'destructive',
      });
    },
  });

  const handleSinglePinReset = (userId: string) => {
    const pin = pinInputs[userId];
    if (!pin || !/^\d{4}$/.test(pin)) {
      toast({
        title: 'Geçersiz PIN',
        description: '4 haneli sayısal PIN girin',
        variant: 'destructive',
      });
      return;
    }
    resetSinglePinMutation.mutate({ userId, pin });
  };

  const handleBulkReset = () => {
    const resets = Object.entries(pinInputs)
      .filter(([_, pin]) => /^\d{4}$/.test(pin))
      .map(([userId, pin]) => ({ userId, pin }));

    if (resets.length === 0) {
      toast({
        title: 'Boş',
        description: 'Önce bir veya daha fazla PIN girin',
        variant: 'destructive',
      });
      return;
    }
    if (!confirm(`${resets.length} kullanıcının PIN'i sıfırlanacak. Onaylıyor musunuz?`)) {
      return;
    }
    bulkResetMutation.mutate(resets);
  };

  const copyPinList = () => {
    if (!data?.users) return;
    const lines = ['HQ Kiosk PIN Listesi (Sprint 10 P-7 Reset)', '=' .repeat(50), ''];
    data.users.forEach((u) => {
      const pin = pinInputs[u.id];
      if (pin) {
        lines.push(`${u.fullName} (${ROLE_LABELS[u.role || ''] || u.role}): ${pin}`);
      }
    });
    lines.push('');
    lines.push('⚠️ GÜVENLİ DAĞITIM:');
    lines.push('- Her kullanıcıya WhatsApp DM ile gönder');
    lines.push("- Grup chat'inde paylaşma");
    lines.push('- 30 gün içinde herkes kendi PIN\'ini değiştirsin');

    const text = lines.join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: '📋 Panoya kopyalandı',
          description: 'PIN listesi WhatsApp\'a yapıştırılabilir',
        });
      })
      .catch(() => {
        toast({
          title: 'Kopyalama hatası',
          description: 'Tarayıcı izin vermedi',
          variant: 'destructive',
        });
      });
  };

  const stats = useMemo(() => {
    if (!data?.users) return null;
    return {
      total: data.users.length,
      withPin: data.users.filter((u) => u.hasPin).length,
      withoutPin: data.users.filter((u) => !u.hasPin).length,
      pendingResets: Object.keys(pinInputs).filter((k) => /^\d{4}$/.test(pinInputs[k])).length,
    };
  }, [data, pinInputs]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="HQ kullanıcılar yüklenemedi" />;
  if (!data || !stats) return null;

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Başlık */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
          <Shield className="h-6 w-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">HQ Kiosk PIN Yönetimi</h1>
          <p className="text-sm text-muted-foreground">
            HQ rolündeki kullanıcılar (CEO, Mahmut, Yavuz, Sema, vb.) için kiosk PIN reset.
            Pilot 18 May öncesi acil iş — Sprint 10 P-7.
          </p>
        </div>
      </div>

      {/* Pilot Day-1 Uyarısı */}
      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/10">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle>Pilot 18 May için kritik</AlertTitle>
        <AlertDescription>
          HQ kullanıcılarının çoğu phone_number = NULL → eski sistem son 4 hane PIN üretemiyor.
          Bu ekrandan her kullanıcı için 4 haneli memorable PIN belirle, WhatsApp ile bildir.
          Pilot Day-1'den sonra herkes kendi PIN'ini değiştirsin (Mart 2026 set-pin endpoint mevcut).
        </AlertDescription>
      </Alert>

      {/* İstatistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Toplam HQ</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">PIN'i Var</div>
            <div className="text-2xl font-bold text-green-600">{stats.withPin}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">PIN'i Yok</div>
            <div className="text-2xl font-bold text-red-600">{stats.withoutPin}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Bekleyen Reset</div>
            <div className="text-2xl font-bold text-amber-600">{stats.pendingResets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Toplu Aksiyonlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Toplu Aksiyonlar</CardTitle>
          <CardDescription>
            Aşağıdaki tabloda PIN'leri girdikten sonra tek tek veya toplu reset edebilirsin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={handleBulkReset}
            disabled={bulkResetMutation.isPending || stats.pendingResets === 0}
            variant="default"
          >
            <Save className="h-4 w-4 mr-2" />
            {stats.pendingResets} PIN'i Toplu Reset
          </Button>
          <Button onClick={copyPinList} variant="outline" disabled={stats.pendingResets === 0}>
            <Copy className="h-4 w-4 mr-2" />
            PIN Listesini Kopyala (WhatsApp)
          </Button>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/hq-users-pin-status'] })}
            variant="ghost"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </CardContent>
      </Card>

      {/* Kullanıcı Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            HQ Kullanıcılar ({data.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="text-center">PIN Durumu</TableHead>
                  <TableHead>Yeni 4 Haneli PIN</TableHead>
                  <TableHead className="text-right">Aksiyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div>{u.fullName}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {ROLE_LABELS[u.role || ''] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-center">
                      {u.hasPin ? (
                        <CheckCircle className="h-5 w-5 text-green-600 inline" />
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          PIN YOK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="\d{4}"
                        maxLength={4}
                        placeholder="••••"
                        value={pinInputs[u.id] || ''}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPinInputs((prev) => ({ ...prev, [u.id]: v }));
                        }}
                        className="w-20 font-mono text-center"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSinglePinReset(u.id)}
                        disabled={
                          !/^\d{4}$/.test(pinInputs[u.id] || '') ||
                          resetSinglePinMutation.isPending
                        }
                      >
                        Reset
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer Notu */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Güvenlik Notu</AlertTitle>
        <AlertDescription className="space-y-1 text-sm">
          <p>• Tüm PIN reset işlemleri audit_logs tablosuna kaydedilir.</p>
          <p>• HQ kullanıcılar pilot Day-1 sonrası kendi PIN'lerini değiştirmeli.</p>
          <p>• PIN'leri toplu chat'te paylaşma — her kullanıcıya özel WhatsApp DM gönder.</p>
          <p>• Memorable PIN seç: doğum yılı, ev numarası, anlamlı tarih (kolay hatırlanır, başkasının tahmin edemediği).</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
