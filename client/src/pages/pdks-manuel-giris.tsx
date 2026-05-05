/**
 * Sprint 13 (5 May 2026) - PDKS Hızlı Manuel Giriş
 * 
 * Aslan'ın talebi (5 May 20:00):
 *   IMG_2084: 'Devam kaydı yok' - PDKS sistemi pilot için boş.
 *   Pilot demo'da Mahmut PDKS gösterebilmeli.
 * 
 * BU SAYFA: Mahmut/Yönetici personel × tarih × giriş/çıkış manuel
 * kayıt girer. /api/pdks/manual endpoint'ine yazar.
 * 
 * Kullanım:
 *   1. Şube seç (HQ rolü için)
 *   2. Personel seç
 *   3. Tarih + giriş saati + çıkış saati gir
 *   4. Kaydet
 *   5. Sistem giriş + çıkış olarak 2 ayrı pdks_records kaydı yapar
 * 
 * Yetki: admin, ceo, cgo, muhasebe, muhasebe_ik, manager, supervisor
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Plus, AlertTriangle, CheckCircle2, Trash2, Calendar } from "lucide-react";

const ALLOWED_ROLES = ['admin', 'ceo', 'cgo', 'muhasebe', 'muhasebe_ik', 'manager', 'supervisor'];

export default function PdksManuelGiris() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAllowed = user?.role && ALLOWED_ROLES.includes(user.role);
  const isHQ = user?.role && ['admin', 'ceo', 'cgo', 'muhasebe', 'muhasebe_ik'].includes(user.role);

  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [recordDate, setRecordDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [entryTime, setEntryTime] = useState<string>('09:00');
  const [exitTime, setExitTime] = useState<string>('18:00');
  const [reason, setReason] = useState<string>('');

  // Şubeler (HQ için)
  const { data: branches } = useQuery<any[]>({
    queryKey: ['/api/branches'],
    enabled: !!isAllowed,
  });

  useEffect(() => {
    if (!selectedBranchId) {
      if (isHQ && branches?.length) {
        const pilot = branches.find((b: any) => [5, 8, 23, 24].includes(b.id) && b.isActive);
        if (pilot) setSelectedBranchId(pilot.id);
      } else if (user?.branchId) {
        setSelectedBranchId(user.branchId);
      }
    }
  }, [isHQ, branches, user, selectedBranchId]);

  // Şubedeki personel
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['/api/personnel', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const res = await fetch(`/api/personnel?branchId=${selectedBranchId}&isActive=true`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedBranchId,
  });

  // Bugünkü kayıtlar
  const { data: todayRecords = [], refetch } = useQuery<any[]>({
    queryKey: ['/api/pdks/records', selectedBranchId, recordDate],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const res = await fetch(
        `/api/pdks/records?branchId=${selectedBranchId}&startDate=${recordDate}&endDate=${recordDate}`,
        { credentials: 'include' }
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedBranchId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !selectedBranchId || !recordDate) {
        throw new Error('Personel, şube ve tarih gerekli');
      }
      
      const promises = [];
      
      if (entryTime) {
        promises.push(apiRequest('POST', '/api/pdks/manual', {
          userId: selectedUserId,
          branchId: selectedBranchId,
          date: recordDate,
          time: entryTime + ':00',
          type: 'giris',
          reason: reason || `Manuel giriş — ${user?.firstName || user?.username || 'Yönetici'}`,
        }));
      }
      
      if (exitTime) {
        promises.push(apiRequest('POST', '/api/pdks/manual', {
          userId: selectedUserId,
          branchId: selectedBranchId,
          date: recordDate,
          time: exitTime + ':00',
          type: 'cikis',
          reason: reason || `Manuel çıkış — ${user?.firstName || user?.username || 'Yönetici'}`,
        }));
      }
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({ title: '✓ Kayıt eklendi', description: `Giriş ${entryTime} + Çıkış ${exitTime} kaydedildi` });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/pdks/records'] });
      queryClient.invalidateQueries({ queryKey: ['/api/performance/personnel'] });
      // Reset
      setSelectedUserId('');
      setReason('');
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  if (!isAllowed) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-bold">Yetki Yok</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Bu sayfa <strong>yönetici</strong> rolleri içindir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4 pb-20">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                PDKS Manuel Giriş
              </CardTitle>
              <CardDescription>
                Personel için giriş/çıkış kaydı manuel ekle (PDKS Excel yoksa)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yeni Kayıt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Şube */}
            <div>
              <Label className="text-xs">Şube</Label>
              <Select 
                value={selectedBranchId ? String(selectedBranchId) : ''} 
                onValueChange={(v) => setSelectedBranchId(Number(v))}
                disabled={!isHQ && !!user?.branchId}
              >
                <SelectTrigger data-testid="select-branch">
                  <SelectValue placeholder="Şube seçin" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.filter((b: any) => b.isActive).map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Personel */}
            <div>
              <Label className="text-xs">Personel *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {[e.firstName, e.lastName].filter(Boolean).join(' ') || e.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {employees.length} aktif personel
              </p>
            </div>

            {/* Tarih */}
            <div>
              <Label className="text-xs">Tarih *</Label>
              <Input 
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                data-testid="input-date"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Giriş Saati</Label>
                <Input 
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  data-testid="input-entry-time"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Çıkış Saati</Label>
                <Input 
                  type="time"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  data-testid="input-exit-time"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="text-xs">Sebep / Not (opsiyonel)</Label>
              <Textarea 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Örn: Hasta izni sonrası dönüş, kiosk arızası, ..."
              />
            </div>

            <div className="md:col-span-2 flex gap-2 justify-end">
              <Button 
                onClick={() => submitMutation.mutate()}
                disabled={!selectedUserId || !selectedBranchId || submitMutation.isPending}
                data-testid="button-save-pdks"
              >
                <Plus className="h-4 w-4 mr-2" />
                Kaydı Ekle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bugünkü Kayıtlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {recordDate} Kayıtları
            <Badge variant="outline" className="ml-2">{todayRecords.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {todayRecords.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Bu tarihte kayıt yok. Yukarıdan ekle.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Saat</TableHead>
                    <TableHead>Personel</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead>Not</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayRecords.map((r: any) => {
                    const emp = employees.find((e: any) => e.id === r.userId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.recordTime?.slice(0, 5)}</TableCell>
                        <TableCell className="text-sm">
                          {emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : r.userId.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.recordType === 'giris' ? 'default' : 'secondary'}>
                            {r.recordType === 'giris' ? '↓ Giriş' : '↑ Çıkış'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.source || 'kiosk'}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={r.deviceInfo}>
                          {r.deviceInfo || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bilgilendirme */}
      <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200">
        <CardContent className="p-3 text-xs">
          <strong>📌 Önemli:</strong>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            <li>• Manuel kayıtlar source='manuel' işaretiyle DB'ye yazılır (audit için)</li>
            <li>• Kiosk girişlerinin yerine geçer ama bunları gerçek kiosk tercih edilir</li>
            <li>• Performans skoru bu kayıtları otomatik PDKS uyumu hesabına dahil eder</li>
            <li>• PDKS Excel toplu import için <strong>/pdks-excel-import</strong></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
