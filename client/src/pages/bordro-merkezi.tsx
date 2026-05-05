/**
 * Sprint 11 (5 May 2026) - Bordro Merkezi Hub
 * 
 * Aslan'ın talebi (5 May 21:00):
 *   "şuanki sistem baya karışık. normalde bir muhasebe, ik crm dashboard
 *    nasıl olmalı? çok daha basit istenilen bilgilere nasıl ulaşılmalı?"
 * 
 * SORUN:
 *   /bordrom (kişisel) + /maas (toplu hesaplama) + /sube-bordro-ozet
 *   → 3 farklı sayfa, kullanıcı hangisini kullanacak belirsiz
 * 
 * ÇÖZÜM:
 *   /bordro-merkezi → tek hub, role bazlı 3 büyük kart
 *   Mevcut sayfalar bozulmadan kalır (link ile yönlendirme)
 * 
 * Use Case Tasnifi:
 *   - HERKES → "Kişisel Bordrom" (kendi maaşı)
 *   - HQ Muhasebe (admin/ceo/cgo/muhasebe/muhasebe_ik) → "Toplu Hesaplama" + "Şube Özeti"
 *   - Şube Müdürü (manager/supervisor) → "Şube Özeti" (kendi şubesi)
 */

import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, Users, Calculator, ChevronRight, FileBarChart, 
  AlertTriangle, CheckCircle2, Clock, TrendingUp, FileText, Settings 
} from "lucide-react";

const HQ_ROLES = ['admin', 'ceo', 'cgo', 'muhasebe', 'muhasebe_ik'];
const BRANCH_MGR_ROLES = ['manager', 'supervisor', 'fabrika_mudur'];

export default function BordroMerkezi() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const isHQ = user?.role && HQ_ROLES.includes(user.role);
  const isBranchMgr = user?.role && BRANCH_MGR_ROLES.includes(user.role);

  // Dönem
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

  // Kişisel bordro durumu
  const { data: myPayroll } = useQuery<any>({
    queryKey: ['/api/payroll/my-current'],
    queryFn: async () => {
      const res = await fetch('/api/payroll/my-current', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // HQ için: bu ay toplu bordro durumu
  const { data: monthlyStatus } = useQuery<any>({
    queryKey: ['/api/payroll/monthly-status', currentYear, currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/payroll/monthly-status?year=${currentYear}&month=${currentMonth}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!isHQ,
  });

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4 pb-20">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Bordro Merkezi
              </CardTitle>
              <CardDescription>
                {months[currentMonth - 1]} {currentYear} dönemi · Tüm bordro işlemleri tek yerde
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {user?.role === 'admin' ? '👑 Admin' :
               user?.role === 'ceo' ? '🎯 CEO' :
               user?.role === 'cgo' ? '⚡ CGO' :
               user?.role === 'muhasebe_ik' ? '📊 Muhasebe IK' :
               user?.role === 'muhasebe' ? '💰 Muhasebe' :
               isBranchMgr ? '🏪 Şube Yöneticisi' : '👤 Personel'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* HQ İÇİN HIZLI ÖZET */}
      {isHQ && monthlyStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold">{monthlyStatus.totalEmployees ?? '?'}</div>
              <div className="text-xs text-muted-foreground">Aktif Personel</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{monthlyStatus.calculatedCount ?? 0}</div>
              <div className="text-xs text-muted-foreground">Hesaplanan</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-2xl font-bold text-orange-500">{monthlyStatus.pendingCount ?? 0}</div>
              <div className="text-xs text-muted-foreground">Bekleyen</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold">
                {monthlyStatus.totalNetTL ? `₺${(monthlyStatus.totalNetTL/1000).toFixed(0)}K` : '-'}
              </div>
              <div className="text-xs text-muted-foreground">Toplam Net</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3 BÜYÜK KART */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. KİŞİSEL BORDRO (HERKES) */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-blue-200" 
          onClick={() => setLocation('/bordrom')}
          data-testid="card-personal-payroll"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base mt-3">Kişisel Bordrom</CardTitle>
            <CardDescription className="text-xs">
              Kendi aylık maaşınız ve detayı
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myPayroll ? (
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  ₺{myPayroll.netSalary?.toLocaleString('tr-TR') || '?'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {months[currentMonth - 1]} {currentYear} · {myPayroll.status === 'approved' ? '✓ Onaylı' : '⏳ Beklemede'}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Bordro henüz hazırlanmadı
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. TOPLU MAAŞ HESAPLAMA (HQ) */}
        {isHQ && (
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200"
            onClick={() => setLocation('/maas')}
            data-testid="card-bulk-payroll"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Calculator className="h-6 w-6 text-purple-600" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-base mt-3">Toplu Hesaplama</CardTitle>
              <CardDescription className="text-xs">
                Tüm personel maaşlarını hesapla
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>{monthlyStatus?.calculatedCount ?? 0} kişi tamamlandı</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-orange-500" />
                  <span>{monthlyStatus?.pendingCount ?? 0} kişi bekliyor</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. ŞUBE BORDRO ÖZETİ (HQ + Branch Manager) */}
        {(isHQ || isBranchMgr) && (
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-green-200"
            onClick={() => setLocation('/sube-bordro-ozet')}
            data-testid="card-branch-summary"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FileBarChart className="h-6 w-6 text-green-600" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-base mt-3">Şube Özeti</CardTitle>
              <CardDescription className="text-xs">
                {isHQ ? 'Şube bazlı bordro raporu' : 'Şubenizin bordro durumu'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Personel × saat × maliyet
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* HQ EK İŞLEMLER */}
      {isHQ && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diğer İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation('/muhasebe?tab=parametreler')}
                className="text-xs"
                data-testid="link-payroll-params"
              >
                <Settings className="h-3 w-3 mr-1" />
                Parametreler
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation('/muhasebe?tab=hesaplama')}
                className="text-xs"
              >
                <Calculator className="h-3 w-3 mr-1" />
                Brüt/Net
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation('/pdks-excel-import')}
                className="text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                PDKS Excel
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation('/ik-raporlari')}
                className="text-xs"
              >
                <FileBarChart className="h-3 w-3 mr-1" />
                IK Raporları
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mevcut Sayfa Uyarısı */}
      {!isHQ && !isBranchMgr && (
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
          <CardContent className="p-3 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Personel Görünümü:</strong> Sadece kendi bordronuza erişebilirsiniz.
              <br/>
              Toplu işlemler için <strong>muhasebe IK / yönetici</strong> yetkisi gerekir.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
