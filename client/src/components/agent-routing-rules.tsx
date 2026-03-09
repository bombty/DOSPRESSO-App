import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Input } from "@/components/ui/input";
import { Pencil, Route, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface RoutingRule {
  id: number;
  category: string;
  subcategory: string;
  description: string;
  primaryRole: string;
  secondaryRole: string | null;
  escalationRole: string | null;
  escalationDays: number;
  isActive: boolean;
  notifyBranchSupervisor: boolean;
  sendHqSummary: boolean;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "ceo", label: "CEO" },
  { value: "cgo", label: "CGO" },
  { value: "coach", label: "Coach" },
  { value: "supervisor", label: "Supervisor" },
  { value: "mudur", label: "Müdür" },
  { value: "trainer", label: "Trainer" },
  { value: "kalite_kontrol", label: "Kalite Kontrol" },
  { value: "satinalma", label: "Satınalma" },
  { value: "fabrika_mudur", label: "Fabrika Müdür" },
  { value: "gida_muhendisi", label: "Gıda Mühendisi" },
];

export function AgentRoutingRulesPanel() {
  const { toast } = useToast();
  const [editRule, setEditRule] = useState<RoutingRule | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    primaryRole: "",
    secondaryRole: "",
    escalationRole: "",
    escalationDays: 0,
    isActive: true,
  });

  const rulesQuery = useQuery<RoutingRule[]>({
    queryKey: ["/api/admin/agent-routing-rules"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      await apiRequest("PATCH", `/api/admin/agent-routing-rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-routing-rules"] });
      setEditDialogOpen(false);
      setEditRule(null);
      toast({ title: "Yönlendirme kuralı güncellendi" });
    },
    onError: () => {
      toast({ title: "Güncelleme hatası", variant: "destructive" });
    },
  });

  const handleEdit = (rule: RoutingRule) => {
    setEditRule(rule);
    setEditForm({
      primaryRole: rule.primaryRole,
      secondaryRole: rule.secondaryRole || "",
      escalationRole: rule.escalationRole || "",
      escalationDays: rule.escalationDays,
      isActive: rule.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editRule) return;
    updateMutation.mutate({
      id: editRule.id,
      data: {
        primaryRole: editForm.primaryRole,
        secondaryRole: editForm.secondaryRole === "none" ? null : (editForm.secondaryRole || null),
        escalationRole: editForm.escalationRole === "none" ? null : (editForm.escalationRole || null),
        escalationDays: editForm.escalationDays,
        isActive: editForm.isActive,
      },
    });
  };

  const rules = rulesQuery.data || [];

  return (
    <div className="space-y-4" data-testid="agent-routing-rules-panel">
      <div className="flex items-center gap-2">
        <Route className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Yönlendirme Kuralları</h3>
      </div>

      {rulesQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-rules">
          Henüz yönlendirme kuralı tanımlanmamış.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Alt Kategori</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Birincil Rol</TableHead>
                    <TableHead>İkincil Rol</TableHead>
                    <TableHead>Eskalasyon Rolü</TableHead>
                    <TableHead>Eskalasyon Süresi (gün)</TableHead>
                    <TableHead>Aktif</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                      <TableCell>
                        <Badge variant="outline">{rule.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{rule.subcategory}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {rule.description}
                      </TableCell>
                      <TableCell className="text-sm">{rule.primaryRole}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.secondaryRole || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.escalationRole || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {rule.escalationDays}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(rule)}
                          data-testid={`button-edit-rule-${rule.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kuralı Düzenle</DialogTitle>
            <DialogDescription>
              {editRule?.category} — {editRule?.subcategory}
            </DialogDescription>
          </DialogHeader>
          {editRule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Birincil Rol</Label>
                <Select
                  value={editForm.primaryRole}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, primaryRole: v }))}
                >
                  <SelectTrigger data-testid="select-primary-role">
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>İkincil Rol</Label>
                <Select
                  value={editForm.secondaryRole}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, secondaryRole: v }))}
                >
                  <SelectTrigger data-testid="select-secondary-role">
                    <SelectValue placeholder="Rol seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Eskalasyon Rolü</Label>
                <Select
                  value={editForm.escalationRole}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, escalationRole: v }))}
                >
                  <SelectTrigger data-testid="select-escalation-role">
                    <SelectValue placeholder="Rol seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Eskalasyon Süresi (gün)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.escalationDays}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, escalationDays: parseInt(e.target.value) || 0 }))
                  }
                  data-testid="input-escalation-days"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Aktif</Label>
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(v) => setEditForm((f) => ({ ...f, isActive: v }))}
                  data-testid="switch-is-active"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="button-save-rule"
            >
              {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}