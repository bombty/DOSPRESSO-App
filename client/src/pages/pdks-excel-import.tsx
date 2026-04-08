import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileSpreadsheet, Users, CheckCircle2, AlertTriangle, Clock, Calculator, ChevronLeft,
} from "lucide-react";
import { useLocation } from "wouter";

const MONTHS = [
  { value: "1", label: "Ocak" }, { value: "2", label: "Şubat" }, { value: "3", label: "Mart" },
  { value: "4", label: "Nisan" }, { value: "5", label: "Mayıs" }, { value: "6", label: "Haziran" },
  { value: "7", label: "Temmuz" }, { value: "8", label: "Ağustos" }, { value: "9", label: "Eylül" },
  { value: "10", label: "Ekim" }, { value: "11", label: "Kasım" }, { value: "12", label: "Aralık" },
];

export default function PdksExcelImport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [file, setFile] = useState<File | null>(null);
  const [branchId, setBranchId] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("2026");
  const [importType, setImportType] = useState("historical");
  const [uploadResult, setUploadResult] = useState<any>(null);

  const canImport = ["admin", "muhasebe", "muhasebe_ik"].includes(user?.role || "");
  if (!canImport) {
    return <div className="p-8 text-center"><p>PDKS Excel içe aktarma yetkiniz yok</p></div>;
  }

  const { data: branches = [] } = useQuery<any[]>({ queryKey: ["/api/branches"] });

  const { data: imports = [] } = useQuery<any[]>({
    queryKey: ["/api/pdks-import/list"],
  });

  const { data: mappings = [] } = useQuery<any[]>({
    queryKey: ["/api/pdks-import/mappings", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await fetch(`/api/pdks-import/mappings?branchId=${branchId}`, { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: !!branchId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !branchId || !month || !year) throw new Error("Tüm alanlar gerekli");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("branchId", branchId);
      formData.append("month", month);
      formData.append("year", year);
      formData.append("importType", importType);

      const res = await fetch("/api/pdks-import/upload", {
        method: "POST", body: formData, credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Yükleme başarısız");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setUploadResult(data);
      qc.invalidateQueries({ queryKey: ["/api/pdks-import/list"] });
      toast({ title: "Excel yüklendi", description: `${data.totalRecords} kayıt, ${data.matchedRecords} eşleşti` });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const calcMutation = useMutation({
    mutationFn: async (importId: number) => {
      const res = await fetch(`/api/pdks-import/${importId}/calculate-daily`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Hesaplama başarısız");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Günlük özet hesaplandı", description: `${data.created} gün oluşturuldu` });
      qc.invalidateQueries({ queryKey: ["/api/pdks-import/list"] });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/pdks")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">PDKS Excel İçe Aktarma</h1>
          <p className="text-sm text-muted-foreground">PDKS cihazı Excel verisini sisteme aktar</p>
        </div>
      </div>

      {/* UPLOAD FORM */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" /> Excel Yükle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Şube *</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Şube seçin" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>İçe Aktarma Tipi</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="historical">Geçmiş Ay (sadece istatistik)</SelectItem>
                  <SelectItem value="current">Güncel Ay (puantaj etkili)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ay *</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue placeholder="Ay" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Yıl *</Label>
              <Input value={year} onChange={e => setYear(e.target.value)} type="number" min={2024} max={2030} />
            </div>
            <div className="md:col-span-2">
              <Label>Excel Dosyası (.xlsx) *</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
          </div>

          {importType === "historical" && (
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                Geçmiş ay verisi sadece istatistiksel amaçlı tutulur — bordro hesabına ETKİ ETMEZ.
              </span>
            </div>
          )}

          <Button
            className="mt-4 w-full"
            onClick={() => uploadMutation.mutate()}
            disabled={!file || !branchId || !month || !year || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <><Clock className="w-4 h-4 mr-1 animate-spin" /> İşleniyor...</>
            ) : (
              <><FileSpreadsheet className="w-4 h-4 mr-1" /> Yükle ve İşle</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* UPLOAD RESULT */}
      {uploadResult && (
        <Card className="mb-6 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-semibold">Yükleme Tamamlandı</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-2xl font-bold">{uploadResult.totalRecords}</div>
                <div className="text-muted-foreground text-xs">Toplam Kayıt</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded">
                <div className="text-2xl font-bold text-green-600">{uploadResult.matchedRecords}</div>
                <div className="text-muted-foreground text-xs">Eşleşen</div>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded">
                <div className="text-2xl font-bold text-red-600">{uploadResult.unmatchedRecords}</div>
                <div className="text-muted-foreground text-xs">Eşleşmeyen</div>
              </div>
            </div>
            {uploadResult.unmatchedNames?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Eşleşmeyen İsimler:</p>
                <div className="flex flex-wrap gap-1">
                  {uploadResult.unmatchedNames.map((n: string) => (
                    <Badge key={n} variant="destructive" className="text-xs">{n}</Badge>
                  ))}
                </div>
              </div>
            )}
            <Button
              className="mt-3 w-full"
              variant="outline"
              onClick={() => calcMutation.mutate(uploadResult.importId)}
              disabled={calcMutation.isPending}
            >
              <Calculator className="w-4 h-4 mr-1" /> Günlük Özet Hesapla
            </Button>
          </CardContent>
        </Card>
      )}

      {/* MAPPING LIST */}
      {branchId && mappings.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" /> Personel Eşleştirmeleri ({mappings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {mappings.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                  <div>
                    <Badge variant="outline" className="font-mono text-xs mr-2">{m.pdksCode}</Badge>
                    {m.pdksName}
                  </div>
                  <span className="text-muted-foreground">→ {m.userName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IMPORT GEÇMİŞİ */}
      {imports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">İçe Aktarma Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {imports.map((imp: any) => (
                <div key={imp.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div>
                    <span className="font-medium text-sm">{imp.branchName}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {MONTHS.find(m => m.value === String(imp.month))?.label} {imp.year}
                    </span>
                    <Badge variant={imp.importType === "historical" ? "secondary" : "default"} className="ml-2 text-[10px]">
                      {imp.importType === "historical" ? "Geçmiş" : "Güncel"}
                    </Badge>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <span className="text-green-600 font-medium">{imp.matchedRecords}</span>/{imp.totalRecords} eşleşti
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
