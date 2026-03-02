import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  Ban,
  Users,
  FileText,
  Building2,
  Loader2,
} from "lucide-react";

interface EmployeeType {
  id: number;
  key: string;
  name: string;
  description: string | null;
  minAge: number | null;
  maxAge: number | null;
  allowedGroups: string[];
  active: boolean;
  policyCount?: number;
}

interface Policy {
  id: number;
  employeeTypeId: number;
  policyKey: string;
  policyJson: Record<string, unknown>;
  active: boolean;
}

interface OrgAssignment {
  id: number;
  orgScope: string;
  orgId: number;
  employeeTypeId: number;
  taskPackKey: string | null;
  active: boolean;
  employeeTypeName?: string;
}

const POLICY_KEYS = [
  "hidden_buckets",
  "max_daily_hours",
  "max_days_per_week",
  "requires_supervision",
  "task_pack",
];

const ALLOWED_GROUPS = ["branch", "factory", "hq"];

const GROUP_LABELS: Record<string, string> = {
  branch: "Sube",
  factory: "Fabrika",
  hq: "Merkez",
};

function EmployeeTypesTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<EmployeeType | null>(null);
  const [formData, setFormData] = useState({
    key: "",
    name: "",
    description: "",
    minAge: "",
    maxAge: "",
    allowedGroups: [] as string[],
  });

  const { data: types = [], isLoading } = useQuery<EmployeeType[]>({
    queryKey: ["/api/admin/employee-types"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/admin/employee-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-types"] });
      toast({ title: "Personel tipi olusturuldu" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/admin/employee-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-types"] });
      toast({ title: "Personel tipi guncellendi" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/employee-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-types"] });
      toast({ title: "Personel tipi devre disi birakildi" });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingType(null);
    setFormData({ key: "", name: "", description: "", minAge: "", maxAge: "", allowedGroups: [] });
  }

  function openCreateDialog() {
    setEditingType(null);
    setFormData({ key: "", name: "", description: "", minAge: "", maxAge: "", allowedGroups: [] });
    setDialogOpen(true);
  }

  function openEditDialog(t: EmployeeType) {
    setEditingType(t);
    setFormData({
      key: t.key,
      name: t.name,
      description: t.description || "",
      minAge: t.minAge?.toString() || "",
      maxAge: t.maxAge?.toString() || "",
      allowedGroups: t.allowedGroups || [],
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      key: formData.key,
      name: formData.name,
      description: formData.description || null,
      minAge: formData.minAge ? parseInt(formData.minAge) : null,
      maxAge: formData.maxAge ? parseInt(formData.maxAge) : null,
      allowedGroups: formData.allowedGroups,
    };
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function toggleGroup(group: string) {
    setFormData((prev) => ({
      ...prev,
      allowedGroups: prev.allowedGroups.includes(group)
        ? prev.allowedGroups.filter((g) => g !== group)
        : [...prev.allowedGroups, group],
    }));
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold" data-testid="text-employee-types-title">
          Personel Tipleri ({types.length})
        </h3>
        <Button onClick={openCreateDialog} data-testid="button-create-employee-type" size="sm">
          <Plus />
          Yeni Tip Ekle
        </Button>
      </div>

      <Table data-testid="table-employee-types">
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Ad</TableHead>
            <TableHead>Aciklama</TableHead>
            <TableHead>Yas Araligi</TableHead>
            <TableHead>Gruplar</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Politika</TableHead>
            <TableHead>Islemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((t) => (
            <TableRow key={t.id} data-testid={`row-employee-type-${t.id}`}>
              <TableCell className="font-mono text-xs">{t.key}</TableCell>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                {t.description || "-"}
              </TableCell>
              <TableCell className="text-xs">
                {t.minAge || "-"} - {t.maxAge || "-"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(t.allowedGroups || []).map((g) => (
                    <Badge key={g} variant="secondary" className="text-xs">
                      {GROUP_LABELS[g] || g}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={t.active ? "success" : "destructive"} data-testid={`badge-status-${t.id}`}>
                  {t.active ? "Aktif" : "Pasif"}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{t.policyCount ?? 0}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(t)}
                    data-testid={`button-edit-type-${t.id}`}
                  >
                    <Pencil />
                  </Button>
                  {t.active && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deactivateMutation.mutate(t.id)}
                      disabled={deactivateMutation.isPending}
                      data-testid={`button-deactivate-type-${t.id}`}
                    >
                      <Ban />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {types.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Henuz personel tipi bulunmuyor
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Personel Tipini Duzenle" : "Yeni Personel Tipi"}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? "Mevcut personel tipini guncelleyin"
                : "Yeni bir personel tipi olusturun"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type-key">Key</Label>
              <Input
                id="type-key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="ornek: part_time_student"
                data-testid="input-type-key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-name">Ad</Label>
              <Input
                id="type-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Personel tipi adi"
                data-testid="input-type-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-description">Aciklama</Label>
              <Input
                id="type-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Aciklama"
                data-testid="input-type-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type-min-age">Min Yas</Label>
                <Input
                  id="type-min-age"
                  type="number"
                  value={formData.minAge}
                  onChange={(e) => setFormData({ ...formData, minAge: e.target.value })}
                  placeholder="15"
                  data-testid="input-type-min-age"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type-max-age">Max Yas</Label>
                <Input
                  id="type-max-age"
                  type="number"
                  value={formData.maxAge}
                  onChange={(e) => setFormData({ ...formData, maxAge: e.target.value })}
                  placeholder="18"
                  data-testid="input-type-max-age"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Izin Verilen Gruplar</Label>
              <div className="flex flex-wrap gap-4">
                {ALLOWED_GROUPS.map((g) => (
                  <div key={g} className="flex items-center gap-2">
                    <Checkbox
                      id={`group-${g}`}
                      checked={formData.allowedGroups.includes(g)}
                      onCheckedChange={() => toggleGroup(g)}
                      data-testid={`checkbox-group-${g}`}
                    />
                    <Label htmlFor={`group-${g}`} className="cursor-pointer text-sm">
                      {GROUP_LABELS[g] || g}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} data-testid="button-cancel-type">
              Iptal
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !formData.key || !formData.name} data-testid="button-save-type">
              {isPending && <Loader2 className="animate-spin" />}
              {editingType ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PoliciesTab() {
  const { toast } = useToast();
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [policyKey, setPolicyKey] = useState("");
  const [policyJson, setPolicyJson] = useState("{}");

  const { data: types = [] } = useQuery<EmployeeType[]>({
    queryKey: ["/api/admin/employee-types"],
  });

  const { data: policies = [], isLoading: policiesLoading } = useQuery<Policy[]>({
    queryKey: ["/api/admin/employee-types", selectedTypeId, "policies"],
    enabled: !!selectedTypeId,
  });

  const createPolicyMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", `/api/admin/employee-types/${selectedTypeId}/policies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/employee-types", selectedTypeId, "policies"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-types"] });
      toast({ title: "Politika olusturuldu" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/employee-type-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/employee-types", selectedTypeId, "policies"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-types"] });
      toast({ title: "Politika silindi" });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setPolicyKey("");
    setPolicyJson("{}");
  }

  function handleCreatePolicy() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(policyJson);
    } catch {
      toast({ title: "Hata", description: "Gecersiz JSON formati", variant: "destructive" });
      return;
    }
    createPolicyMutation.mutate({ policyKey, policyJson: parsed });
  }

  function renderPolicyJson(json: Record<string, unknown>) {
    return (
      <pre className="text-xs bg-muted/50 rounded-md p-2 max-w-[300px] overflow-auto">
        {JSON.stringify(json, null, 2)}
      </pre>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-semibold" data-testid="text-policies-title">
            Politikalar
          </h3>
          <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
            <SelectTrigger className="w-[220px]" data-testid="select-policy-type">
              <SelectValue placeholder="Personel tipi secin" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedTypeId && (
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            data-testid="button-create-policy"
          >
            <Plus />
            Yeni Politika
          </Button>
        )}
      </div>

      {!selectedTypeId && (
        <div className="text-center text-muted-foreground py-12">
          Politikalari goruntulemek icin bir personel tipi secin
        </div>
      )}

      {selectedTypeId && policiesLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {selectedTypeId && !policiesLoading && (
        <Table data-testid="table-policies">
          <TableHeader>
            <TableRow>
              <TableHead>Politika Key</TableHead>
              <TableHead>Deger (JSON)</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Islemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((p) => (
              <TableRow key={p.id} data-testid={`row-policy-${p.id}`}>
                <TableCell>
                  <Badge variant="outline">{p.policyKey}</Badge>
                </TableCell>
                <TableCell>{renderPolicyJson(p.policyJson)}</TableCell>
                <TableCell>
                  <Badge variant={p.active ? "success" : "destructive"}>
                    {p.active ? "Aktif" : "Pasif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deletePolicyMutation.mutate(p.id)}
                    disabled={deletePolicyMutation.isPending}
                    data-testid={`button-delete-policy-${p.id}`}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {policies.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Bu tip icin henuz politika bulunmuyor
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Politika</DialogTitle>
            <DialogDescription>
              Secili personel tipi icin yeni bir politika ekleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Politika Key</Label>
              <Select value={policyKey} onValueChange={setPolicyKey}>
                <SelectTrigger data-testid="select-policy-key">
                  <SelectValue placeholder="Politika tipi secin" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Politika JSON</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[120px] font-mono"
                value={policyJson}
                onChange={(e) => setPolicyJson(e.target.value)}
                placeholder='{"value": true}'
                data-testid="input-policy-json"
              />
              {policyKey === "hidden_buckets" && (
                <p className="text-xs text-muted-foreground">
                  Ornek: {`{"buckets": ["gorev1", "gorev2"]}`}
                </p>
              )}
              {policyKey === "max_daily_hours" && (
                <p className="text-xs text-muted-foreground">
                  Ornek: {`{"hours": 8}`}
                </p>
              )}
              {policyKey === "max_days_per_week" && (
                <p className="text-xs text-muted-foreground">
                  Ornek: {`{"days": 5}`}
                </p>
              )}
              {policyKey === "requires_supervision" && (
                <p className="text-xs text-muted-foreground">
                  Ornek: {`{"required": true}`}
                </p>
              )}
              {policyKey === "task_pack" && (
                <p className="text-xs text-muted-foreground">
                  Ornek: {`{"packKey": "basic_tasks"}`}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} data-testid="button-cancel-policy">
              Iptal
            </Button>
            <Button
              onClick={handleCreatePolicy}
              disabled={createPolicyMutation.isPending || !policyKey}
              data-testid="button-save-policy"
            >
              {createPolicyMutation.isPending && <Loader2 className="animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssignmentsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    orgScope: "",
    orgId: "",
    employeeTypeId: "",
    taskPackKey: "",
  });

  const { data: assignments = [], isLoading } = useQuery<OrgAssignment[]>({
    queryKey: ["/api/admin/org-assignments"],
  });

  const { data: types = [] } = useQuery<EmployeeType[]>({
    queryKey: ["/api/admin/employee-types"],
  });

  const activeTypes = types.filter((t) => t.active);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/admin/org-assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/org-assignments"] });
      toast({ title: "Atama olusturuldu" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/org-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/org-assignments"] });
      toast({ title: "Atama silindi" });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setFormData({ orgScope: "", orgId: "", employeeTypeId: "", taskPackKey: "" });
  }

  function handleCreate() {
    createMutation.mutate({
      orgScope: formData.orgScope,
      orgId: parseInt(formData.orgId),
      employeeTypeId: parseInt(formData.employeeTypeId),
      taskPackKey: formData.taskPackKey || null,
    });
  }

  function getTypeName(typeId: number) {
    const found = types.find((t) => t.id === typeId);
    return found?.name || `Tip #${typeId}`;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold" data-testid="text-assignments-title">
          Sube Atamalari ({assignments.length})
        </h3>
        <Button size="sm" onClick={() => setDialogOpen(true)} data-testid="button-create-assignment">
          <Plus />
          Yeni Atama
        </Button>
      </div>

      <Table data-testid="table-assignments">
        <TableHeader>
          <TableRow>
            <TableHead>Kapsam</TableHead>
            <TableHead>Org ID</TableHead>
            <TableHead>Personel Tipi</TableHead>
            <TableHead>Gorev Paketi</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Islemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((a) => (
            <TableRow key={a.id} data-testid={`row-assignment-${a.id}`}>
              <TableCell>
                <Badge variant="outline">
                  {a.orgScope === "branch" ? "Sube" : a.orgScope === "factory" ? "Fabrika" : a.orgScope}
                </Badge>
              </TableCell>
              <TableCell>{a.orgId}</TableCell>
              <TableCell className="font-medium">
                {a.employeeTypeName || getTypeName(a.employeeTypeId)}
              </TableCell>
              <TableCell className="text-xs font-mono">{a.taskPackKey || "-"}</TableCell>
              <TableCell>
                <Badge variant={a.active ? "success" : "destructive"}>
                  {a.active ? "Aktif" : "Pasif"}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(a.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-assignment-${a.id}`}
                >
                  <Trash2 />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {assignments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Henuz atama bulunmuyor
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Atama</DialogTitle>
            <DialogDescription>
              Bir sube veya fabrikaya personel tipi atayin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kapsam</Label>
              <Select value={formData.orgScope} onValueChange={(v) => setFormData({ ...formData, orgScope: v })}>
                <SelectTrigger data-testid="select-assignment-scope">
                  <SelectValue placeholder="Kapsam secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="branch">Sube</SelectItem>
                  <SelectItem value="factory">Fabrika</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-id">Org ID</Label>
              <Input
                id="org-id"
                type="number"
                value={formData.orgId}
                onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
                placeholder="Organizasyon ID"
                data-testid="input-assignment-org-id"
              />
            </div>
            <div className="space-y-2">
              <Label>Personel Tipi</Label>
              <Select
                value={formData.employeeTypeId}
                onValueChange={(v) => setFormData({ ...formData, employeeTypeId: v })}
              >
                <SelectTrigger data-testid="select-assignment-type">
                  <SelectValue placeholder="Personel tipi secin" />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-pack-key">Gorev Paketi Key</Label>
              <Input
                id="task-pack-key"
                value={formData.taskPackKey}
                onChange={(e) => setFormData({ ...formData, taskPackKey: e.target.value })}
                placeholder="Opsiyonel"
                data-testid="input-assignment-task-pack"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} data-testid="button-cancel-assignment">
              Iptal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createMutation.isPending ||
                !formData.orgScope ||
                !formData.orgId ||
                !formData.employeeTypeId
              }
              data-testid="button-save-assignment"
            >
              {createMutation.isPending && <Loader2 className="animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminEmployeeTypes() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="text-muted-foreground" />
            Personel Tipi Yonetimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="types" data-testid="tabs-employee-types">
            <TabsList>
              <TabsTrigger value="types" data-testid="tab-types">
                <Users className="mr-1" />
                Personel Tipleri
              </TabsTrigger>
              <TabsTrigger value="policies" data-testid="tab-policies">
                <FileText className="mr-1" />
                Politikalar
              </TabsTrigger>
              <TabsTrigger value="assignments" data-testid="tab-assignments">
                <Building2 className="mr-1" />
                Sube Atamalari
              </TabsTrigger>
            </TabsList>
            <TabsContent value="types">
              <EmployeeTypesTab />
            </TabsContent>
            <TabsContent value="policies">
              <PoliciesTab />
            </TabsContent>
            <TabsContent value="assignments">
              <AssignmentsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
