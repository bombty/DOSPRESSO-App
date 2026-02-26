import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Shield, Database, ScrollText, ChevronLeft, ChevronRight } from "lucide-react";

const SENSITIVITY_COLORS: Record<string, string> = {
  public: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  internal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  confidential: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  restricted: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const SENSITIVITY_LABELS: Record<string, string> = {
  public: "Herkese Açık",
  internal: "Dahili",
  confidential: "Gizli",
  restricted: "Kısıtlı",
};

const DECISION_COLORS: Record<string, string> = {
  ALLOW: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ALLOW_AGGREGATED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  DENY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const DECISION_LABELS: Record<string, string> = {
  ALLOW: "Tam Erişim",
  ALLOW_AGGREGATED: "Özet",
  DENY: "Engelli",
};

const ALL_ROLES = [
  "ceo", "cgo", "admin", "coach", "trainer", "kalite_kontrol",
  "supervisor", "supervisor_buddy", "mudur",
  "barista", "bar_buddy", "stajyer",
  "fabrika", "fabrika_mudur", "fabrika_sorumlu", "fabrika_operator", "fabrika_personel", "fabrika_teknisyen",
  "satinalma", "muhasebe", "muhasebe_ik", "teknik", "ekipman_teknik", "destek", "operasyon", "ik"
];

const ROLE_GROUPS: Record<string, string[]> = {
  "HQ": ["ceo", "cgo", "admin"],
  "Koç/Eğitmen": ["coach", "trainer", "kalite_kontrol"],
  "Şube Yönetim": ["supervisor", "supervisor_buddy", "mudur"],
  "Şube Personel": ["barista", "bar_buddy", "stajyer"],
  "Fabrika": ["fabrika", "fabrika_mudur", "fabrika_sorumlu", "fabrika_operator", "fabrika_personel", "fabrika_teknisyen"],
  "Destek": ["satinalma", "muhasebe", "muhasebe_ik", "teknik", "ekipman_teknik", "destek", "operasyon", "ik"]
};

interface AiDomain {
  id: number;
  key: string;
  labelTr: string;
  labelEn: string;
  description: string | null;
  sensitivity: string;
  isActive: boolean;
}

interface AiPolicy {
  id: number;
  domainId: number;
  domainKey: string;
  domainLabel: string;
  role: string;
  employeeType: string | null;
  decision: string;
  scope: string;
}

function DomainsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<AiDomain | null>(null);
  const [form, setForm] = useState({ key: "", labelTr: "", labelEn: "", description: "", sensitivity: "internal" });

  const { data: domains = [], isLoading } = useQuery<AiDomain[]>({
    queryKey: ["/api/admin/ai-domains"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/ai-domains", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-domains"] });
      setDialogOpen(false);
      toast({ title: "Veri alanı oluşturuldu" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/admin/ai-domains/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-domains"] });
      setDialogOpen(false);
      setEditingDomain(null);
      toast({ title: "Güncellendi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/ai-domains/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-policies"] });
      toast({ title: "Silindi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingDomain(null);
    setForm({ key: "", labelTr: "", labelEn: "", description: "", sensitivity: "internal" });
    setDialogOpen(true);
  };

  const openEdit = (d: AiDomain) => {
    setEditingDomain(d);
    setForm({ key: d.key, labelTr: d.labelTr, labelEn: d.labelEn, description: d.description || "", sensitivity: d.sensitivity });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingDomain) {
      updateMutation.mutate({ id: editingDomain.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-domains-title">Veri Alanları</h3>
          <p className="text-sm text-muted-foreground">AI asistanın erişebileceği veri kategorilerini yönetin</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-domain">
          <Plus className="h-4 w-4 mr-1" />
          Yeni Alan
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Anahtar</TableHead>
            <TableHead>Türkçe Ad</TableHead>
            <TableHead>Hassasiyet</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((d) => (
            <TableRow key={d.id} data-testid={`row-domain-${d.id}`}>
              <TableCell className="font-mono text-sm">{d.key}</TableCell>
              <TableCell>{d.labelTr}</TableCell>
              <TableCell>
                <Badge className={`no-default-hover-elevate no-default-active-elevate ${SENSITIVITY_COLORS[d.sensitivity] || ""}`}>
                  {SENSITIVITY_LABELS[d.sensitivity] || d.sensitivity}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={d.isActive ? "default" : "secondary"}>
                  {d.isActive ? "Aktif" : "Pasif"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(d)} data-testid={`button-edit-domain-${d.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(d.id)} data-testid={`button-delete-domain-${d.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDomain ? "Veri Alanı Düzenle" : "Yeni Veri Alanı"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Anahtar (key)</Label>
              <Input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="ornek_alan" data-testid="input-domain-key" disabled={!!editingDomain} />
            </div>
            <div>
              <Label>Türkçe Ad</Label>
              <Input value={form.labelTr} onChange={e => setForm({ ...form, labelTr: e.target.value })} placeholder="Örnek Alan" data-testid="input-domain-label-tr" />
            </div>
            <div>
              <Label>İngilizce Ad</Label>
              <Input value={form.labelEn} onChange={e => setForm({ ...form, labelEn: e.target.value })} placeholder="Example Domain" data-testid="input-domain-label-en" />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="input-domain-description" />
            </div>
            <div>
              <Label>Hassasiyet</Label>
              <Select value={form.sensitivity} onValueChange={v => setForm({ ...form, sensitivity: v })}>
                <SelectTrigger data-testid="select-domain-sensitivity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Herkese Açık</SelectItem>
                  <SelectItem value="internal">Dahili</SelectItem>
                  <SelectItem value="confidential">Gizli</SelectItem>
                  <SelectItem value="restricted">Kısıtlı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-domain">
              {editingDomain ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyMatrixTab() {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState("HQ");

  const { data: domains = [] } = useQuery<AiDomain[]>({
    queryKey: ["/api/admin/ai-domains"],
  });

  const { data: policies = [], isLoading } = useQuery<AiPolicy[]>({
    queryKey: ["/api/admin/ai-policies"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: string }) =>
      apiRequest("PATCH", `/api/admin/ai-policies/${id}`, { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-policies"] });
      toast({ title: "Politika güncellendi" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/ai-policies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-policies"] });
      toast({ title: "Politika oluşturuldu" });
    },
  });

  const groupRoles = ROLE_GROUPS[selectedGroup] || [];

  const getPolicy = (domainId: number, role: string) =>
    policies.find(p => p.domainId === domainId && p.role === role);

  const handleDecisionChange = (domainId: number, role: string, decision: string) => {
    const existing = getPolicy(domainId, role);
    if (existing) {
      updateMutation.mutate({ id: existing.id, decision });
    } else {
      createMutation.mutate({ domainId, role, decision, scope: "org_wide" });
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-matrix-title">Politika Matrisi</h3>
        <p className="text-sm text-muted-foreground">Her rol için veri erişim kurallarını belirleyin</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.keys(ROLE_GROUPS).map(group => (
          <Button
            key={group}
            variant={selectedGroup === group ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedGroup(group)}
            data-testid={`button-group-${group}`}
          >
            {group}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Veri Alanı</TableHead>
              {groupRoles.map(role => (
                <TableHead key={role} className="min-w-[120px] text-center">{role}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.filter(d => d.isActive).map(domain => (
              <TableRow key={domain.id} data-testid={`row-policy-${domain.key}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{domain.labelTr}</span>
                    <Badge className={`no-default-hover-elevate no-default-active-elevate text-xs ${SENSITIVITY_COLORS[domain.sensitivity] || ""}`}>
                      {SENSITIVITY_LABELS[domain.sensitivity]?.[0] || "?"}
                    </Badge>
                  </div>
                </TableCell>
                {groupRoles.map(role => {
                  const policy = getPolicy(domain.id, role);
                  const currentDecision = policy?.decision || "DENY";
                  return (
                    <TableCell key={role} className="text-center">
                      <Select
                        value={currentDecision}
                        onValueChange={v => handleDecisionChange(domain.id, role, v)}
                      >
                        <SelectTrigger className={`text-xs ${DECISION_COLORS[currentDecision] || ""}`} data-testid={`select-policy-${domain.key}-${role}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALLOW">Tam Erişim</SelectItem>
                          <SelectItem value="ALLOW_AGGREGATED">Özet</SelectItem>
                          <SelectItem value="DENY">Engelli</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AiLogsTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery<{ logs: any[]; total: number }>({
    queryKey: ["/api/admin/ai-logs", page, statusFilter, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/ai-logs?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Log yüklenemedi");
      return res.json();
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-logs-title">AI İşlem Logları</h3>
        <p className="text-sm text-muted-foreground">Dobody AI asistan kullanım kayıtları</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-log-status">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="success">Başarılı</SelectItem>
            <SelectItem value="denied">Engellendi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-log-role">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {ALL_ROLES.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Tür</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Girdi</TableHead>
            <TableHead>Çıktı</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Süre</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Henüz log kaydı yok
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log: any) => (
              <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                <TableCell className="text-xs whitespace-nowrap">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString("tr-TR") : "-"}
                </TableCell>
                <TableCell className="text-xs">{log.runType}</TableCell>
                <TableCell className="text-xs">{log.targetRoleScope}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate" title={log.inputSummary}>
                  {log.inputSummary || "-"}
                </TableCell>
                <TableCell className="text-xs max-w-[200px] truncate" title={log.outputSummary}>
                  {log.outputSummary || "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={log.status === "denied" ? "destructive" : "default"}
                    className="no-default-hover-elevate no-default-active-elevate"
                  >
                    {log.status === "denied" ? "Engellendi" : log.status === "success" ? "Başarılı" : log.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{log.executionTimeMs ? `${log.executionTimeMs}ms` : "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            size="icon"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminAIPolitikalari() {
  return (
    <div className="space-y-4" data-testid="page-ai-policies">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-bold">AI Politika Konsolu</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Mr. Dobody AI asistanın hangi rollerin hangi verilere erişebileceğini merkezi olarak yönetin
      </p>

      <Tabs defaultValue="domains">
        <TabsList>
          <TabsTrigger value="domains" data-testid="tab-domains">
            <Database className="h-4 w-4 mr-1" />
            Veri Alanları
          </TabsTrigger>
          <TabsTrigger value="matrix" data-testid="tab-matrix">
            <Shield className="h-4 w-4 mr-1" />
            Politika Matrisi
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            <ScrollText className="h-4 w-4 mr-1" />
            AI Logları
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domains">
          <Card>
            <CardContent className="pt-6">
              <DomainsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix">
          <Card>
            <CardContent className="pt-6">
              <PolicyMatrixTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="pt-6">
              <AiLogsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
