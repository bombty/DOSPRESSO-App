import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ShieldCheck, AlertTriangle, Search, CheckCircle2, Beaker, Info, X } from "lucide-react";

interface PendingRow {
  id: number;
  ingredientName: string;
  energyKcal: string | null;
  fatG: string | null;
  saturatedFatG: string | null;
  transFatG: string | null;
  carbohydrateG: string | null;
  sugarG: string | null;
  fiberG: string | null;
  proteinG: string | null;
  saltG: string | null;
  sodiumMg: string | null;
  allergens: string[] | null;
  source: string | null;
  confidence: number | null;
  verifiedBy: string | null;
}

interface PendingResponse {
  items: PendingRow[];
  total: number;
}

const NUTRITION_FIELDS: Array<{ key: keyof PendingRow; short: string; unit: string }> = [
  { key: "energyKcal", short: "Enerji", unit: "kcal" },
  { key: "fatG", short: "Yağ", unit: "g" },
  { key: "saturatedFatG", short: "D.Yağ", unit: "g" },
  { key: "carbohydrateG", short: "Karb.", unit: "g" },
  { key: "sugarG", short: "Şeker", unit: "g" },
  { key: "fiberG", short: "Lif", unit: "g" },
  { key: "proteinG", short: "Prot.", unit: "g" },
  { key: "saltG", short: "Tuz", unit: "g" },
];

type EditState = Record<string, string>;

function buildInitialEdit(row: PendingRow): EditState {
  const init: EditState = {};
  NUTRITION_FIELDS.forEach(f => {
    const v = row[f.key];
    init[f.key as string] = v == null ? "" : String(v);
  });
  init.allergens = (row.allergens ?? []).join(", ");
  return init;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Bilinmeyen hata";
}

interface PendingTableRowProps {
  row: PendingRow;
  selected: boolean;
  onToggleSelect: (id: number, checked: boolean) => void;
}

function PendingTableRow({ row, selected, onToggleSelect }: PendingTableRowProps) {
  const { toast } = useToast();
  const [edit, setEdit] = useState<EditState>(() => buildInitialEdit(row));

  useEffect(() => {
    setEdit(buildInitialEdit(row));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        allergens: edit.allergens
          ? edit.allergens.split(",").map(s => s.trim()).filter(Boolean)
          : [],
      };
      NUTRITION_FIELDS.forEach(f => {
        payload[f.key as string] = edit[f.key as string] === "" ? null : edit[f.key as string];
      });
      const res = await apiRequest(
        "PATCH",
        `/api/factory/ingredient-nutrition/${row.id}/onay`,
        payload,
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Onaylandı",
        description: `${row.ingredientName} besin değerleri doğrulandı.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/factory/ingredient-nutrition/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality/allergens/recipes"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "Onay başarısız",
        description: errorMessage(err),
        variant: "destructive",
      });
    },
  });

  return (
    <TableRow data-testid={`row-pending-${row.id}`} data-state={selected ? "selected" : undefined}>
      <TableCell className="align-top w-[40px]">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggleSelect(row.id, v === true)}
          aria-label={`${row.ingredientName} seç`}
          data-testid={`checkbox-row-${row.id}`}
        />
      </TableCell>
      <TableCell className="font-medium align-top" data-testid={`text-ingredient-${row.id}`}>
        <div>{row.ingredientName}</div>
        {row.source && (
          <div className="text-xs text-muted-foreground">{row.source}</div>
        )}
      </TableCell>
      {NUTRITION_FIELDS.map(f => (
        <TableCell
          key={f.key as string}
          className="align-top w-[88px]"
        >
          <Input
            inputMode="decimal"
            value={edit[f.key as string] ?? ""}
            onChange={(e) =>
              setEdit(prev => ({ ...prev, [f.key as string]: e.target.value }))
            }
            className="h-9 px-2 text-right tabular-nums"
            aria-label={`${f.short} (${f.unit})`}
            data-testid={`input-${String(f.key)}-${row.id}`}
          />
        </TableCell>
      ))}
      <TableCell className="align-top w-[180px]">
        <Input
          value={edit.allergens ?? ""}
          onChange={(e) => setEdit(prev => ({ ...prev, allergens: e.target.value }))}
          placeholder="gluten, süt..."
          className="h-9"
          aria-label="Alerjenler"
          data-testid={`input-allergens-${row.id}`}
        />
      </TableCell>
      <TableCell className="text-center align-top">
        <Badge variant="outline" data-testid={`text-confidence-${row.id}`}>
          {row.confidence ?? 0}%
        </Badge>
      </TableCell>
      <TableCell className="text-right align-top">
        <Button
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          data-testid={`button-approve-${row.id}`}
        >
          <CheckCircle2 className="w-3 h-3" />
          {mutation.isPending ? "..." : "Onayla"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function KaliteBesinOnayPage() {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkNote, setBulkNote] = useState("");
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<PendingResponse>({
    queryKey: ["/api/factory/ingredient-nutrition/pending"],
  });

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(r => r.ingredientName.toLowerCase().includes(q));
  }, [data, search]);

  // Drop selections that no longer exist in the current list (after refetch)
  useEffect(() => {
    if (!data) return;
    const existing = new Set(data.items.map(i => i.id));
    setSelectedIds(prev => {
      const next = new Set<number>();
      prev.forEach(id => { if (existing.has(id)) next.add(id); });
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  const filteredIds = useMemo(() => filtered.map(r => r.id), [filtered]);
  const selectedInFiltered = useMemo(
    () => filteredIds.filter(id => selectedIds.has(id)),
    [filteredIds, selectedIds],
  );
  const allFilteredSelected = filteredIds.length > 0 && selectedInFiltered.length === filteredIds.length;
  const someFilteredSelected = selectedInFiltered.length > 0 && !allFilteredSelected;

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) filteredIds.forEach(id => next.add(id));
      else filteredIds.forEach(id => next.delete(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      const res = await apiRequest("POST", "/api/factory/ingredient-nutrition/onay-toplu", {
        ids,
        note: bulkNote.trim() || undefined,
      });
      return res.json() as Promise<{
        ok: boolean;
        approvedCount: number;
        skippedCount: number;
      }>;
    },
    onSuccess: (result) => {
      toast({
        title: "Toplu onay tamamlandı",
        description:
          result.skippedCount > 0
            ? `${result.approvedCount} kayıt onaylandı, ${result.skippedCount} kayıt atlandı.`
            : `${result.approvedCount} kayıt manual_verified olarak işaretlendi.`,
      });
      setBulkDialogOpen(false);
      setBulkNote("");
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["/api/factory/ingredient-nutrition/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality/allergens/recipes"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "Toplu onay başarısız",
        description: errorMessage(err),
        variant: "destructive",
      });
    },
  });

  const selectionCount = selectedIds.size;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-besin-onay">
            <Beaker className="w-6 h-6 text-primary" />
            Besin Değer Onay Paneli
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Güven skoru %100 altında olan hammaddeleri tabloda satır içi düzenleyip
            tek tıkla onaylayın. Onay sonrası kayıt
            <span className="font-medium"> manual_verified </span>
            olarak işaretlenir ve denetim izine eklenir.
          </p>
        </div>
        {data && (
          <Badge variant="outline" className="gap-1" data-testid="badge-pending-total">
            <AlertTriangle className="w-3 h-3" /> {data.total} bekleyen kayıt
          </Badge>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Hammadde adı ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-pending"
        />
      </div>

      {selectionCount > 0 && (
        <div
          className="sticky top-2 z-50 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3 shadow-md"
          data-testid="bar-bulk-actions"
        >
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="default" data-testid="badge-selection-count">
              {selectionCount} seçildi
            </Badge>
            <span className="text-muted-foreground">
              Seçilenleri tek tıkla manual_verified olarak işaretleyin.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              data-testid="button-clear-selection"
            >
              <X className="w-3 h-3" />
              Seçimi temizle
            </Button>
            <Button
              size="sm"
              onClick={() => setBulkDialogOpen(true)}
              data-testid="button-open-bulk-approve"
            >
              <CheckCircle2 className="w-3 h-3" />
              Seçilenleri Onayla
            </Button>
          </div>
        </div>
      )}

      {isLoading && <ListSkeleton count={4} />}
      {error && <ErrorState message={`Liste yüklenemedi: ${errorMessage(error)}`} />}

      {data && filtered.length === 0 && !isLoading && (
        <EmptyState
          title={data.total === 0 ? "Onay bekleyen kayıt yok" : "Sonuç bulunamadı"}
          description={
            data.total === 0
              ? "Tüm hammaddeler doğrulanmış görünüyor."
              : "Aramanıza uygun bekleyen kayıt yok."
          }
          icon={ShieldCheck}
        />
      )}

      {data && filtered.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bekleyen hammaddeler</CardTitle>
            <CardDescription className="text-xs">
              {filtered.length} kayıt · 100 g başına değerler · değerleri düzenleyip Onayla'ya tıklayın
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table data-testid="table-pending">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          allFilteredSelected
                            ? true
                            : someFilteredSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(v) => toggleSelectAllFiltered(v === true)}
                        aria-label="Görünen tüm kayıtları seç"
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead className="min-w-[200px]">Hammadde</TableHead>
                    {NUTRITION_FIELDS.map(f => (
                      <TableHead key={f.key as string} className="text-right whitespace-nowrap">
                        {f.short} <span className="text-muted-foreground">({f.unit})</span>
                      </TableHead>
                    ))}
                    <TableHead>Alerjenler</TableHead>
                    <TableHead className="text-center">Güven</TableHead>
                    <TableHead className="text-right">Aksiyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(row => (
                    <PendingTableRow
                      key={row.id}
                      row={row}
                      selected={selectedIds.has(row.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground flex items-start gap-1.5 px-1 pt-2">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Onay yetkisi: <code>gida_muhendisi</code>, <code>kalite_yoneticisi</code>, <code>ust_yonetim</code>.
          Tüm onaylar audit log&apos;a önceki/sonraki değerleriyle yazılır.
        </span>
      </div>

      <Dialog open={bulkDialogOpen} onOpenChange={(open) => {
        if (!bulkMutation.isPending) setBulkDialogOpen(open);
      }}>
        <DialogContent data-testid="dialog-bulk-approve">
          <DialogHeader>
            <DialogTitle>Seçilen kayıtları onayla</DialogTitle>
            <DialogDescription>
              {selectionCount} kayıt aynı kaynak referansıyla manual_verified olarak işaretlenecek
              ve her biri için audit log oluşturulacak.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="bulk-note">
              Not (isteğe bağlı)
            </label>
            <Textarea
              id="bulk-note"
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              placeholder="Örn. TÜRKOMP referansı ile doğrulandı"
              rows={3}
              maxLength={500}
              data-testid="input-bulk-note"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              disabled={bulkMutation.isPending}
              data-testid="button-cancel-bulk"
            >
              Vazgeç
            </Button>
            <Button
              onClick={() => bulkMutation.mutate()}
              disabled={bulkMutation.isPending || selectionCount === 0}
              data-testid="button-confirm-bulk-approve"
            >
              <CheckCircle2 className="w-3 h-3" />
              {bulkMutation.isPending ? "Onaylanıyor..." : `${selectionCount} kaydı onayla`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
