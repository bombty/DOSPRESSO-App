import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Lock, Pencil } from "lucide-react";
import type { DataLockRule } from "@shared/schema";

export default function AdminVeriKilitleri() {
  const { toast } = useToast();
  const [editDialog, setEditDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<DataLockRule | null>(null);
  const [editLockDays, setEditLockDays] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState(true);

  const { data: rules = [], isLoading } = useQuery<DataLockRule[]>({
    queryKey: ["/api/admin/data-lock-rules"],
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; lockAfterDays: number | null; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/data-lock-rules/${data.id}`, {
        lockAfterDays: data.lockAfterDays,
        isActive: data.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/data-lock-rules"] });
      setEditDialog(false);
      toast({ title: "Kural güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kural güncellenemedi", variant: "destructive" });
    },
  });

  const handleEdit = (rule: DataLockRule) => {
    setEditingRule(rule);
    setEditLockDays(rule.lockAfterDays != null ? String(rule.lockAfterDays) : "");
    setEditIsActive(rule.isActive);
    setEditDialog(true);
  };

  const handleSave = () => {
    if (!editingRule) return;
    updateMutation.mutate({
      id: editingRule.id,
      lockAfterDays: editLockDays ? parseInt(editLockDays, 10) : null,
      isActive: editIsActive,
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Veri Kilitleri</h1>
        </div>
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5" />
        <div>
          <h1 className="text-lg font-semibold">Veri Kilitleri</h1>
          <p className="text-xs text-muted-foreground">{rules.length} kural tanımlı</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tablo</TableHead>
                <TableHead>Kilit Süresi (gün)</TableHead>
                <TableHead>Durum Kilidi</TableHead>
                <TableHead>Hemen Kilitli</TableHead>
                <TableHead>Değişiklik Talebi</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Henüz kilit kuralı tanımlanmamış
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                    <TableCell className="font-medium" data-testid={`text-table-${rule.id}`}>
                      {rule.tableName}
                    </TableCell>
                    <TableCell data-testid={`text-lockdays-${rule.id}`}>
                      {rule.lockAfterDays != null ? `${rule.lockAfterDays} gün` : "-"}
                    </TableCell>
                    <TableCell data-testid={`text-lockstatus-${rule.id}`}>
                      {rule.lockOnStatus || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.lockImmediately ? "default" : "outline"} data-testid={`badge-immediate-${rule.id}`}>
                        {rule.lockImmediately ? "Evet" : "Hayır"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.canRequestChange ? "default" : "outline"} data-testid={`badge-canrequest-${rule.id}`}>
                        {rule.canRequestChange ? "Evet" : "Hayır"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" data-testid={`text-desc-${rule.id}`}>
                      {rule.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.isActive ? "default" : "destructive"} data-testid={`badge-active-${rule.id}`}>
                        {rule.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(rule)}
                        data-testid={`button-edit-rule-${rule.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kural Düzenle</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Tablo</Label>
                <p className="font-medium" data-testid="text-edit-table">{editingRule.tableName}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lockDays">Kilit Süresi (gün)</Label>
                <Input
                  id="lockDays"
                  type="number"
                  value={editLockDays}
                  onChange={(e) => setEditLockDays(e.target.value)}
                  placeholder="Boş bırakılırsa süre kilidi yok"
                  data-testid="input-lock-days"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                  data-testid="switch-is-active"
                />
                <Label htmlFor="isActive">Aktif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} data-testid="button-cancel-edit">
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
