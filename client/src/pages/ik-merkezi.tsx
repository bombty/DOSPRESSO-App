/**
 * Sprint 13 (5 May 2026) - İK Merkezi Hub
 * 
 * Aslan'ın talebi (5 May 21:00):
 *   "şuanki sistem baya karışık. normalde bir muhasebe, ik crm dashboard
 *    nasıl olmalı? çok daha basit istenilen bilgilere nasıl ulaşılmalı?"
 * 
 * SORUN:
 *   IK için 5+ farklı giriş noktası var:
 *   - /ik (personel listesi)
 *   - /vardiya-planlama
 *   - /pdks
 *   - /izin-talepleri
 *   - /performansim, /performans-yonetim
 *   - /bordrom, /bordro-merkezi
 *   - /ik-raporlari
 *   Kullanıcı kafası karışıyor, hangisini açacak belirsiz.
 * 
 * ÇÖZÜM:
 *   /ik-merkezi → tek hub, role bazlı
 *   - "Hızlı İşlemler" kartı (en sık yapılan 3 iş)
 *   - "Tüm Modüller" kartı (kategori bazlı)
 *   - Bekleyen işler (izin onayı, mesai talebi, eksik bordro)
 *   - Mevcut sayfalar bozulmadan kalır (link ile yönlendirme)
 * 
 * Yetki: tüm authenticated user'lar görür, içerik role bazlı filter
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, Clock, Calendar, CreditCard, TrendingUp, 
  ClipboardCheck, FileText, Coffee, Star, AlertTriangle,
  ArrowRight, BarChart2, UserPlus, Wallet
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: any;
  color: string;
  allowedRoles?: string[];
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'outline';
}

const QUICK_ACTIONS: QuickAction[] = [
  // Tüm kullanıcılar
  { id: 'bordrom', label: 'Bordrom', description: 'Kişisel maaş ve bordro detayı', path: '/bordrom', icon: CreditCard, color: 'green' },
  { id: 'performansim', label: 'Performansım', description: 'Skor, sıralama, AI öneriler', path: '/performansim', icon: TrendingUp, color: 'blue' },
  { id: 'izin-talep', label: 'İzin Talep', description: 'Yeni izin başvurusu', path: '/izin-talepleri', icon: Calendar, color: 'orange' },
  { id: 'mesai-talep', label: 'Mesai Talep', description: 'Fazla mesai başvurusu', path: '/mesai-talepleri', icon: Clock, color: 'purple' },
  
  // Yöneticiler
  { id: 'manager-rating', label: 'Personel Puanla', description: 'Takımındaki personeli değerlendir', path: '/yonetici-puanlama', icon: Star, color: 'yellow', 
    allowedRoles: ['admin','ceo','cgo','manager','supervisor','fabrika_mudur'] },
  { id: 'sube-bordro', label: 'Şube Bordrosu', description: 'Şube personel bordro durumu', path: '/sube-bordro-ozet', icon: Wallet, color: 'green',
    allowedRoles: ['admin','ceo','cgo','muhasebe','muhasebe_ik','manager','supervisor','fabrika_mudur'] },
  { id: 'vardiya-planla', label: 'Vardiya Planla', description: 'Haftalık vardiya planlama', path: '/vardiya-planlama', icon: Coffee, color: 'blue',
    allowedRoles: ['admin','ceo','cgo','manager','supervisor','fabrika_mudur','coach','trainer'] },
  
  // HQ
  { id: 'performans-yonetim', label: 'Performans Yönetim', description: 'Tüm personel skor takibi (filtreli)', path: '/performans-yonetim', icon: BarChart2, color: 'red',
    allowedRoles: ['admin','ceo','cgo','coach','trainer','muhasebe','muhasebe_ik'] },
  { id: 'ik-raporlar', label: 'İK Raporları', description: 'PDKS, devam, performans raporları', path: '/ik-raporlari', icon: FileText, color: 'gray',
    allowedRoles: ['admin','ceo','cgo','coach','trainer','muhasebe','muhasebe_ik'] },
  { id: 'personel-yonetim', label: 'Personel Yönetimi', description: 'Personel listesi, ekle/düzenle', path: '/ik', icon: Users, color: 'indigo',
    allowedRoles: ['admin','ceo','cgo','coach','trainer','muhasebe_ik'] },
  { id: 'onboarding', label: 'Onboarding', description: 'Yeni personel akışı', path: '/personel-onboarding-akisi', icon: UserPlus, color: 'teal',
    allowedRoles: ['admin','ceo','cgo','muhasebe_ik','manager','supervisor','coach','trainer','fabrika_mudur'] },
  
  // Admin
  { id: 'bordro-toplu', label: 'Toplu Bordro Hesaplama', description: 'Aylık tüm personel bordro', path: '/maas', icon: CreditCard, color: 'green',
    allowedRoles: ['admin','ceo','cgo','muhasebe','muhasebe_ik'] },
  { id: 'skor-parametre', label: 'Skor Kriterleri (Admin)', description: 'Performans skor parametreleri', path: '/admin/skor-parametreleri', icon: BarChart2, color: 'purple',
    allowedRoles: ['admin','ceo'] },
];

const COLOR_CLASSES: Record<string, string> = {
  green: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950 dark:text-green-400',
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-400',
  red: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-400',
  yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-400',
  orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400',
  purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-400',
  gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
  indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-400',
  teal: 'bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-400',
};

export default function IKMerkezi() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Bekleyen işler
  const { data: pendingLeaves = 0 } = useQuery<number>({
    queryKey: ['/api/leave-requests/pending-count'],
    queryFn: async () => {
      const res = await fetch('/api/leave-requests?status=pending', { credentials: 'include' });
      if (!res.ok) return 0;
      const data = await res.json();
      return Array.isArray(data) ? data.length : (data.count || 0);
    },
    enabled: !!user,
  });

  const { data: pendingOvertimes = 0 } = useQuery<number>({
    queryKey: ['/api/overtime-requests/pending-count'],
    queryFn: async () => {
      const res = await fetch('/api/overtime-requests?status=pending', { credentials: 'include' });
      if (!res.ok) return 0;
      const data = await res.json();
      return Array.isArray(data) ? data.length : (data.count || 0);
    },
    enabled: !!user,
  });

  // Action filtreleme — role kontrolü
  const visibleActions = QUICK_ACTIONS.filter(action => {
    if (!action.allowedRoles) return true;
    return user?.role && action.allowedRoles.includes(user.role);
  });

  // Kategorize et
  const personalActions = visibleActions.filter(a => 
    ['bordrom', 'performansim', 'izin-talep', 'mesai-talep'].includes(a.id)
  );
  const managerActions = visibleActions.filter(a => 
    ['manager-rating', 'sube-bordro', 'vardiya-planla'].includes(a.id)
  );
  const hqActions = visibleActions.filter(a => 
    ['performans-yonetim', 'ik-raporlar', 'personel-yonetim', 'onboarding'].includes(a.id)
  );
  const adminActions = visibleActions.filter(a => 
    ['bordro-toplu', 'skor-parametre'].includes(a.id)
  );

  const renderActionCard = (action: QuickAction) => {
    const Icon = action.icon;
    return (
      <button
        key={action.id}
        onClick={() => setLocation(action.path)}
        className={`p-4 rounded-lg transition-all text-left ${COLOR_CLASSES[action.color]} cursor-pointer w-full`}
        data-testid={`action-${action.id}`}
      >
        <div className="flex items-start justify-between mb-2">
          <Icon className="h-6 w-6" />
          {action.badge && (
            <Badge variant={action.badgeVariant || 'default'} className="text-xs">
              {action.badge}
            </Badge>
          )}
        </div>
        <div className="font-semibold text-sm">{action.label}</div>
        <div className="text-xs opacity-80 mt-1">{action.description}</div>
        <ArrowRight className="h-4 w-4 mt-3 opacity-60" />
      </button>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4 pb-20">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            İK Merkezi
          </CardTitle>
          <CardDescription>
            Tüm İK işlemleriniz tek yerde · {visibleActions.length} modül erişilebilir
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Bekleyen İşler */}
      {(pendingLeaves > 0 || pendingOvertimes > 0) && (
        <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Bekleyen İşler
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            {pendingLeaves > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setLocation('/izin-talepleri')}
                className="bg-orange-50"
                data-testid="button-pending-leaves"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {pendingLeaves} izin talebi
              </Button>
            )}
            {pendingOvertimes > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setLocation('/mesai-talepleri')}
                className="bg-purple-50"
                data-testid="button-pending-overtimes"
              >
                <Clock className="h-4 w-4 mr-2" />
                {pendingOvertimes} mesai talebi
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Kişisel İşlemler */}
      {personalActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kişisel</CardTitle>
            <CardDescription>Bordro, performans, izin/mesai talebi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {personalActions.map(renderActionCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Yönetici İşlemleri */}
      {managerActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yönetici</CardTitle>
            <CardDescription>Takım yönetimi, vardiya, şube bordro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {managerActions.map(renderActionCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* HQ İşlemleri */}
      {hqActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">HQ / Merkez</CardTitle>
            <CardDescription>Tüm şubeler, raporlama, personel yönetimi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {hqActions.map(renderActionCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin İşlemleri */}
      {adminActions.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              ⚙️ Admin
            </CardTitle>
            <CardDescription>Bordro hesaplama, sistem parametreleri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {adminActions.map(renderActionCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bilgilendirme */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
        <CardContent className="p-3 text-xs">
          <strong>💡 İK Merkezi nedir?</strong>
          <p className="text-muted-foreground mt-1">
            Tüm İK ve personel işlemlerine tek yerden erişim. Kart üzerine tıklayarak
            ilgili modüle geçebilirsiniz. Görünen modüller rolünüze göre filtrelenir.
            <br/>
            Daha fazla detay için yan menüden tüm modüllere erişebilirsiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
