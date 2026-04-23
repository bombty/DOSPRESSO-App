import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ShieldCheck, AlertTriangle, Search, CheckCircle2, Beaker, Info } from "lucide-react";

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

function PendingTableRow({ row }: { row: PendingRow }) {
  const { toast } = useToast();
  const [edit, setEdit] = useState<EditState>(() => buildInitialEdit(row));

  // Reset local edit state when the underlying row identity/data changes
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
    <TableRow data-testid={`row-pending-${row.id}`}>
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

  const { data, isLoading, error } = useQuery<PendingResponse>({
    queryKey: ["/api/factory/ingredient-nutrition/pending"],
  });

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(r => r.ingredientName.toLowerCase().includes(q));
  }, [data, search]);

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
                    <PendingTableRow key={row.id} row={row} />
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
    </div>
  );
}
