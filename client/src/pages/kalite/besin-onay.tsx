import { useEffect, useMemo, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import {
  ShieldCheck, AlertTriangle, Search, CheckCircle2, Beaker, Info, X,
  ChevronDown, ChevronRight, History, UserCheck, Download, Undo2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

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

interface ApprovedRow extends PendingRow {
  updatedAt: string | null;
  verifierFirstName: string | null;
  verifierLastName: string | null;
  verifierEmail: string | null;
}

interface ApprovedResponse {
  items: ApprovedRow[];
  total: number;
}

interface AuditEntry {
  id: number;
  eventType: string;
  action: string;
  actorRole: string | null;
  userId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  createdAt: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
}

interface AuditResponse {
  items: AuditEntry[];
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

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manuel",
  manual_verified: "Manuel Onay",
  ai: "AI",
  usda: "USDA",
  turkomp: "TÜRKOMP",
};

const SOURCE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  manual_verified: "default",
  ai: "secondary",
  turkomp: "secondary",
  usda: "secondary",
  manual: "outline",
};

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

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function verifierLabel(row: ApprovedRow | AuditEntry): string {
  const first = "verifierFirstName" in row ? row.verifierFirstName : row.userFirstName;
  const last = "verifierFirstName" in row ? row.verifierLastName : row.userLastName;
  const email = "verifierFirstName" in row ? row.verifierEmail : row.userEmail;
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || email || "—";
}

interface HistoryEntry {
  id: number;
  nutritionId: number | null;
  ingredientName: string;
  action: string;
  source: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedBy: string | null;
  changedByRole: string | null;
  changedAt: string;
  note: string | null;
  changedByName: string | null;
  changedByLastName: string | null;
  changedByEmail: string | null;
}

interface HistoryResponse {
  items: HistoryEntry[];
  total: number;
  ingredientName: string | null;
  nutritionId: number | null;
}

const HISTORY_FIELDS: Array<{ key: string; label: string; unit: string }> = [
  { key: "energyKcal", label: "Enerji", unit: "kcal" },
  { key: "fatG", label: "Yağ", unit: "g" },
  { key: "saturatedFatG", label: "D.Yağ", unit: "g" },
  { key: "transFatG", label: "T.Yağ", unit: "g" },
  { key: "carbohydrateG", label: "Karb.", unit: "g" },
  { key: "sugarG", label: "Şeker", unit: "g" },
  { key: "fiberG", label: "Lif", unit: "g" },
  { key: "proteinG", label: "Prot.", unit: "g" },
  { key: "saltG", label: "Tuz", unit: "g" },
  { key: "sodiumMg", label: "Sodyum", unit: "mg" },
];

const ACTION_LABEL: Record<string, string> = {
  create: "Oluşturma",
  update: "Güncelleme",
  approve: "Onay",
  bulk_approve: "Toplu Onay",
  revert: "Geri Çevirme",
};

const SOURCE_LABEL: Record<string, string> = {
  ingredient_post: "Reçete malzemesi",
  nutrition_put: "Onay paneli düzenleme",
  approve: "Tek tıkla onay",
  bulk_approve: "Toplu onay",
  seed: "Seed/import",
  revert: "Bekleyene geri çevirme",
};

function formatActor(e: HistoryEntry): string {
  const name = [e.changedByName, e.changedByLastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (e.changedByEmail) return e.changedByEmail;
  if (e.changedBy) return e.changedBy;
  return "Sistem";
}

function diffPairs(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const pairs: Array<{ key: string; label: string; unit: string; before: string; after: string; changed: boolean }> = [];
  for (const f of HISTORY_FIELDS) {
    const b = before ? before[f.key] : null;
    const a = after ? after[f.key] : null;
    const bs = b == null || b === "" ? "—" : String(b);
    const as = a == null || a === "" ? "—" : String(a);
    if (bs === "—" && as === "—") continue;
    pairs.push({ key: f.key, label: f.label, unit: f.unit, before: bs, after: as, changed: bs !== as });
  }
  // Allergens
  const ba = before ? (before as any).allergens : null;
  const aa = after ? (after as any).allergens : null;
  const bsA = Array.isArray(ba) ? (ba.join(", ") || "—") : "—";
  const asA = Array.isArray(aa) ? (aa.join(", ") || "—") : "—";
  if (bsA !== "—" || asA !== "—") {
    pairs.push({ key: "allergens", label: "Alerjenler", unit: "", before: bsA, after: asA, changed: bsA !== asA });
  }
  return pairs;
}

function HistoryDialog({ open, onOpenChange, ingredientName, nutritionId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientName: string;
  nutritionId: number | null;
}) {
  const queryKey = ["/api/factory/ingredient-nutrition", nutritionId, "history"] as const;
  const { data, isLoading, error } = useQuery<HistoryResponse>({
    queryKey,
    enabled: open && nutritionId != null,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/factory/ingredient-nutrition/${nutritionId}/history`);
      return res.json();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="dialog-nutrition-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" /> Besin değer geçmişi — {ingredientName}
          </DialogTitle>
          <DialogDescription>
            Bu hammaddenin besin değerlerinde yapılmış tüm insert/update kayıtları.
            Kim, ne zaman, hangi ekranda değiştirdi — eski / yeni değerler ile birlikte.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <ListSkeleton count={2} />}
        {error && <ErrorState message={`Geçmiş yüklenemedi: ${errorMessage(error)}`} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title="Henüz değişiklik kaydı yok"
            description="Bu hammadde için audit defterinde kayıt bulunmuyor."
            icon={History}
          />
        )}

        <div className="space-y-3">
          {data?.items.map((entry) => {
            const pairs = diffPairs(entry.before, entry.after);
            return (
              <Card key={entry.id} data-testid={`card-history-entry-${entry.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default" data-testid={`badge-action-${entry.id}`}>
                        {ACTION_LABEL[entry.action] ?? entry.action}
                      </Badge>
                      <Badge variant="outline">
                        {SOURCE_LABEL[entry.source] ?? entry.source}
                      </Badge>
                      {entry.changedByRole && (
                        <Badge variant="secondary">{entry.changedByRole}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {new Date(entry.changedAt).toLocaleString("tr-TR")}
                    </div>
                  </div>
                  <CardDescription className="text-xs pt-1">
                    <span className="font-medium">{formatActor(entry)}</span>
                    {entry.note && <span className="ml-2">— {entry.note}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {pairs.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sayısal değer değişikliği yok (sadece meta).</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Alan</TableHead>
                            <TableHead className="text-right">Eski</TableHead>
                            <TableHead className="text-right">Yeni</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pairs.map(p => (
                            <TableRow key={p.key} className={p.changed ? "bg-muted/40" : undefined}>
                              <TableCell className="text-xs">
                                {p.label} {p.unit && <span className="text-muted-foreground">({p.unit})</span>}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">{p.before}</TableCell>
                              <TableCell className={`text-right text-xs tabular-nums ${p.changed ? "font-semibold" : ""}`}>
                                {p.after}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-history">
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PendingTableRowProps {
  row: PendingRow;
  selected: boolean;
  onToggleSelect: (id: number, checked: boolean) => void;
  onShowHistory: (row: PendingRow) => void;
  onEditChange: (id: number, edit: EditState) => void;
}

function PendingTableRow({ row, selected, onToggleSelect, onShowHistory, onEditChange }: PendingTableRowProps) {
  const { toast } = useToast();
  const [edit, setEdit] = useState<EditState>(() => buildInitialEdit(row));

  useEffect(() => {
    const init = buildInitialEdit(row);
    setEdit(init);
    onEditChange(row.id, init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  useEffect(() => {
    onEditChange(row.id, edit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/factory/ingredient-nutrition/approved"] });
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
          <div className="text-xs text-muted-foreground">{SOURCE_LABELS[row.source] ?? row.source}</div>
        )}
      </TableCell>
      {NUTRITION_FIELDS.map(f => (
        <TableCell key={f.key as string} className="align-top w-[88px]">
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
        <div className="flex items-center justify-end gap-1 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onShowHistory(row)}
            data-testid={`button-history-${row.id}`}
            title="Değişiklik geçmişi"
          >
            <History className="w-3 h-3" />
            Geçmiş
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid={`button-approve-${row.id}`}
          >
            <CheckCircle2 className="w-3 h-3" />
            {mutation.isPending ? "..." : "Onayla"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function formatDelta(before: Record<string, unknown> | null, after: Record<string, unknown> | null): Array<{ key: string; from: string; to: string }> {
  const out: Array<{ key: string; from: string; to: string }> = [];
  if (!before && !after) return out;
  const keys = Array.from(new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]));
  const niceLabel: Record<string, string> = {
    energyKcal: "Enerji (kcal)",
    fatG: "Yağ (g)",
    saturatedFatG: "Doymuş Yağ (g)",
    transFatG: "Trans Yağ (g)",
    carbohydrateG: "Karbonhidrat (g)",
    sugarG: "Şeker (g)",
    fiberG: "Lif (g)",
    proteinG: "Protein (g)",
    saltG: "Tuz (g)",
    sodiumMg: "Sodyum (mg)",
    allergens: "Alerjenler",
    source: "Kaynak",
    confidence: "Güven",
    verifiedBy: "Onaylayan",
  };
  const stringify = (v: unknown): string => {
    if (v == null) return "—";
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
    return String(v);
  };
  for (const k of keys) {
    const a = stringify((before ?? {})[k]);
    const b = stringify((after ?? {})[k]);
    if (a !== b) {
      out.push({ key: niceLabel[k] ?? k, from: a, to: b });
    }
  }
  return out;
}

function ApprovedTableRow({
  row,
  canRevert,
  onRevert,
}: {
  row: ApprovedRow;
  canRevert: boolean;
  onRevert: (row: ApprovedRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const audit = useQuery<AuditResponse>({
    queryKey: ["/api/factory/ingredient-nutrition", row.id, "audit"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/factory/ingredient-nutrition/${row.id}/audit?limit=10`);
      return res.json();
    },
    enabled: open,
  });

  const sourceKey = row.source ?? "manual";
  const sourceVariant = SOURCE_VARIANTS[sourceKey] ?? "outline";

  return (
    <>
      <TableRow data-testid={`row-approved-${row.id}`}>
        <TableCell className="align-top">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? "Detayı kapat" : "Detayı aç"}
            data-testid={`button-toggle-audit-${row.id}`}
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </TableCell>
        <TableCell className="font-medium align-top" data-testid={`text-approved-name-${row.id}`}>
          {row.ingredientName}
        </TableCell>
        {NUTRITION_FIELDS.map(f => (
          <TableCell key={f.key as string} className="text-right align-top tabular-nums whitespace-nowrap">
            {row[f.key] == null ? "—" : String(row[f.key])}
          </TableCell>
        ))}
        <TableCell className="align-top">
          <div className="flex flex-wrap gap-1">
            {(row.allergens ?? []).length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              (row.allergens ?? []).map((a, i) => (
                <Badge key={`${a}-${i}`} variant="secondary" className="text-xs">{a}</Badge>
              ))
            )}
          </div>
        </TableCell>
        <TableCell className="align-top">
          <Badge variant={sourceVariant} data-testid={`badge-source-${row.id}`}>
            {SOURCE_LABELS[sourceKey] ?? sourceKey}
          </Badge>
        </TableCell>
        <TableCell className="align-top whitespace-nowrap" data-testid={`text-verifier-${row.id}`}>
          <div className="flex items-center gap-1.5 text-sm">
            <UserCheck className="w-3 h-3 text-muted-foreground" />
            {verifierLabel(row)}
          </div>
        </TableCell>
        <TableCell className="align-top whitespace-nowrap text-sm text-muted-foreground" data-testid={`text-approved-date-${row.id}`}>
          {formatDateTime(row.updatedAt)}
        </TableCell>
        <TableCell className="text-right align-top whitespace-nowrap">
          {canRevert ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRevert(row)}
              data-testid={`button-revert-${row.id}`}
              title="Bu kaydı tekrar bekleyene döndür"
            >
              <Undo2 className="w-3 h-3" />
              Geri çevir
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow data-testid={`row-audit-${row.id}`}>
          <TableCell colSpan={NUTRITION_FIELDS.length + 7} className="bg-muted/30">
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <History className="w-4 h-4" />
                Onay geçmişi
              </div>
              {audit.isLoading && <ListSkeleton count={2} />}
              {audit.error && (
                <div className="text-sm text-destructive">
                  Audit kayıtları yüklenemedi: {errorMessage(audit.error)}
                </div>
              )}
              {audit.data && audit.data.items.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Bu kayıt için audit girişi bulunamadı.
                </div>
              )}
              {audit.data && audit.data.items.length > 0 && (
                <div className="space-y-3">
                  {audit.data.items.map(entry => {
                    const deltas = formatDelta(entry.before, entry.after);
                    return (
                      <div key={entry.id} className="rounded-md border p-3 space-y-2 bg-card" data-testid={`audit-entry-${entry.id}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{verifierLabel(entry)}</span>
                            {entry.actorRole && (
                              <Badge variant="outline" className="text-xs">{entry.actorRole}</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(entry.createdAt)}
                          </span>
                        </div>
                        {deltas.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Değer değişikliği yok.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-left font-normal py-1 pr-3">Alan</th>
                                  <th className="text-left font-normal py-1 pr-3">Önceki</th>
                                  <th className="text-left font-normal py-1">Sonraki</th>
                                </tr>
                              </thead>
                              <tbody>
                                {deltas.map((d, i) => (
                                  <tr key={i} className="border-t">
                                    <td className="py-1 pr-3 font-medium">{d.key}</td>
                                    <td className="py-1 pr-3 text-muted-foreground line-through">{d.from}</td>
                                    <td className="py-1 tabular-nums">{d.to}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {(() => {
                          const note = entry.details?.note;
                          return typeof note === "string" && note ? (
                            <div className="text-xs text-muted-foreground italic">
                              Not: {note}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

const REVERT_ALLOWED_ROLES = new Set(["admin", "kalite_yoneticisi", "ust_yonetim"]);

export default function KaliteBesinOnayPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canRevert = !!user?.role && REVERT_ALLOWED_ROLES.has(user.role);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [search, setSearch] = useState("");
  const [approvedSearch, setApprovedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkNote, setBulkNote] = useState("");
  const [historyTarget, setHistoryTarget] = useState<{ id: number; name: string } | null>(null);
  const editsRef = useRef<Map<number, EditState>>(new Map());
  const handleEditChange = (id: number, edit: EditState) => {
    editsRef.current.set(id, { ...edit });
  };
  const [revertTarget, setRevertTarget] = useState<ApprovedRow | null>(null);
  const [revertNote, setRevertNote] = useState("");

  const revertMutation = useMutation({
    mutationFn: async () => {
      if (!revertTarget) throw new Error("Hedef kayıt yok");
      const res = await apiRequest(
        "POST",
        `/api/factory/ingredient-nutrition/${revertTarget.id}/revert`,
        { note: revertNote.trim() },
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Bekleyene döndürüldü",
        description: revertTarget
          ? `${revertTarget.ingredientName} tekrar onay bekliyor.`
          : "Kayıt bekleyene alındı.",
      });
      setRevertTarget(null);
      setRevertNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/factory/ingredient-nutrition/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/factory/ingredient-nutrition/approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality/allergens/recipes"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "Geri çevirme başarısız",
        description: errorMessage(err),
        variant: "destructive",
      });
    },
  });

  const pendingQuery = useQuery<PendingResponse>({
    queryKey: ["/api/factory/ingredient-nutrition/pending"],
  });

  const approvedQuery = useQuery<ApprovedResponse>({
    queryKey: ["/api/factory/ingredient-nutrition/approved", { search: approvedSearch, source: sourceFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (approvedSearch.trim()) params.set("search", approvedSearch.trim());
      if (sourceFilter && sourceFilter !== "all") params.set("source", sourceFilter);
      const qs = params.toString();
      const res = await apiRequest(
        "GET",
        `/api/factory/ingredient-nutrition/approved${qs ? `?${qs}` : ""}`,
      );
      return res.json();
    },
    enabled: tab === "approved",
  });

  const filteredPending = useMemo(() => {
    const items = pendingQuery.data?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(r => r.ingredientName.toLowerCase().includes(q));
  }, [pendingQuery.data, search]);

  // Drop selections that no longer exist in the current list (after refetch)
  useEffect(() => {
    const items = pendingQuery.data?.items;
    if (!items) return;
    const existing = new Set(items.map(i => i.id));
    setSelectedIds(prev => {
      const next = new Set<number>();
      prev.forEach(id => { if (existing.has(id)) next.add(id); });
      return next.size === prev.size ? prev : next;
    });
  }, [pendingQuery.data]);

  const filteredIds = useMemo(() => filteredPending.map(r => r.id), [filteredPending]);
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
      // Her seçili satırın güncel edit state'ini items[] içine koy.
      // Boş string -> null, sayısallar string olarak gönderilir (backend numericLike çözer).
      const items = ids
        .map((id) => {
          const edit = editsRef.current.get(id);
          if (!edit) return null;
          const payload: Record<string, unknown> = { id };
          NUTRITION_FIELDS.forEach((f) => {
            const key = f.key as string;
            const v = edit[key];
            payload[key] = v === undefined || v === "" ? null : v;
          });
          payload.allergens = edit.allergens
            ? edit.allergens.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          return payload;
        })
        .filter((it): it is Record<string, unknown> => it != null);

      const res = await apiRequest("POST", "/api/factory/ingredient-nutrition/onay-toplu", {
        ids,
        ...(items.length > 0 ? { items } : {}),
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
      queryClient.invalidateQueries({ queryKey: ["/api/factory/ingredient-nutrition/approved"] });
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

  const triggerExport = (format: "csv" | "xlsx") => {
    const params = new URLSearchParams();
    if (approvedSearch.trim()) params.set("search", approvedSearch.trim());
    if (sourceFilter && sourceFilter !== "all") params.set("source", sourceFilter);
    params.set("format", format);
    const url = `/api/factory/ingredient-nutrition/approved/export?${params.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-besin-onay">
            <Beaker className="w-6 h-6 text-primary" />
            Besin Değer Onay Paneli
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bekleyen kayıtları satır içi düzenleyip onaylayın; geçmiş onayları
            <span className="font-medium"> Onaylanmış </span>
            sekmesinden inceleyin. Her onay denetim izine yazılır.
          </p>
        </div>
        {pendingQuery.data && (
          <Badge variant="outline" className="gap-1" data-testid="badge-pending-total">
            <AlertTriangle className="w-3 h-3" /> {pendingQuery.data.total} bekleyen kayıt
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "approved")}>
        <TabsList data-testid="tabs-besin-onay">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Bekleyen
            {pendingQuery.data ? ` (${pendingQuery.data.total})` : ""}
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Onaylanmış
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
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

          {pendingQuery.isLoading && <ListSkeleton count={4} />}
          {pendingQuery.error && <ErrorState message={`Liste yüklenemedi: ${errorMessage(pendingQuery.error)}`} />}

          {pendingQuery.data && filteredPending.length === 0 && !pendingQuery.isLoading && (
            <EmptyState
              title={pendingQuery.data.total === 0 ? "Onay bekleyen kayıt yok" : "Sonuç bulunamadı"}
              description={
                pendingQuery.data.total === 0
                  ? "Tüm hammaddeler doğrulanmış görünüyor."
                  : "Aramanıza uygun bekleyen kayıt yok."
              }
              icon={ShieldCheck}
            />
          )}

          {pendingQuery.data && filteredPending.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bekleyen hammaddeler</CardTitle>
                <CardDescription className="text-xs">
                  {filteredPending.length} kayıt · 100 g başına değerler · değerleri düzenleyip Onayla'ya tıklayın
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
                      {filteredPending.map(row => (
                        <PendingTableRow
                          key={row.id}
                          row={row}
                          selected={selectedIds.has(row.id)}
                          onToggleSelect={toggleSelect}
                          onShowHistory={(r) => setHistoryTarget({ id: r.id, name: r.ingredientName })}
                          onEditChange={handleEditChange}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hammadde adı ara..."
                value={approvedSearch}
                onChange={(e) => setApprovedSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-approved"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="sm:w-[200px]" data-testid="select-source-filter">
                <SelectValue placeholder="Kaynak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm kaynaklar</SelectItem>
                <SelectItem value="manual_verified">Manuel Onay</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
                <SelectItem value="turkomp">TÜRKOMP</SelectItem>
                <SelectItem value="usda">USDA</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="sm:w-auto"
                  disabled={!approvedQuery.data || approvedQuery.data.items.length === 0}
                  data-testid="button-export-approved"
                >
                  <Download className="w-4 h-4" />
                  Dışa aktar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => triggerExport("csv")}
                  data-testid="menu-export-csv"
                >
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => triggerExport("xlsx")}
                  data-testid="menu-export-xlsx"
                >
                  Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {approvedQuery.isLoading && <ListSkeleton count={4} />}
          {approvedQuery.error && <ErrorState message={`Liste yüklenemedi: ${errorMessage(approvedQuery.error)}`} />}

          {approvedQuery.data && approvedQuery.data.items.length === 0 && !approvedQuery.isLoading && (
            <EmptyState
              title="Onaylanmış kayıt bulunamadı"
              description={
                approvedSearch || sourceFilter !== "all"
                  ? "Filtreye uygun kayıt yok. Filtreyi temizleyip tekrar deneyin."
                  : "Henüz hiçbir hammadde için onay yapılmamış."
              }
              icon={ShieldCheck}
            />
          )}

          {approvedQuery.data && approvedQuery.data.items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Onaylanmış hammaddeler</CardTitle>
                <CardDescription className="text-xs">
                  {approvedQuery.data.total} kayıt · son onaya göre sıralı · satırı genişleterek önceki/sonraki değer karşılaştırmasını görüntüleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table data-testid="table-approved">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="min-w-[200px]">Hammadde</TableHead>
                        {NUTRITION_FIELDS.map(f => (
                          <TableHead key={f.key as string} className="text-right whitespace-nowrap">
                            {f.short} <span className="text-muted-foreground">({f.unit})</span>
                          </TableHead>
                        ))}
                        <TableHead>Alerjenler</TableHead>
                        <TableHead>Kaynak</TableHead>
                        <TableHead>Onaylayan</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Aksiyon</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedQuery.data.items.map(row => (
                        <ApprovedTableRow
                          key={row.id}
                          row={row}
                          canRevert={canRevert}
                          onRevert={(r) => setRevertTarget(r)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground flex items-start gap-1.5 px-1 pt-2">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Onay yetkisi: <code>gida_muhendisi</code>, <code>kalite_yoneticisi</code>, <code>ust_yonetim</code>.
          Tüm onaylar audit log&apos;a önceki/sonraki değerleriyle yazılır.
        </span>
      </div>

      <HistoryDialog
        open={historyTarget !== null}
        onOpenChange={(open) => { if (!open) setHistoryTarget(null); }}
        ingredientName={historyTarget?.name ?? ""}
        nutritionId={historyTarget?.id ?? null}
      />

      <Dialog
        open={revertTarget !== null}
        onOpenChange={(open) => {
          if (!open && !revertMutation.isPending) {
            setRevertTarget(null);
            setRevertNote("");
          }
        }}
      >
        <DialogContent data-testid="dialog-revert-approved">
          <DialogHeader>
            <DialogTitle>Onayı geri çevir</DialogTitle>
            <DialogDescription>
              {revertTarget?.ingredientName ?? ""} kaydı tekrar bekleyen statüsüne alınacak.
              Onayı veren bilgisi temizlenir; güven değeri onay öncesindeki seviyeye
              (yoksa %80'e) düşürülür ve geri çevirme nedeni audit defterine yazılır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="revert-note">
              Geri çevirme nedeni <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="revert-note"
              value={revertNote}
              onChange={(e) => setRevertNote(e.target.value)}
              placeholder="Örn. Yanlış kaynak referansı, AI değerleri laboratuvar sonucuyla uyuşmuyor..."
              rows={3}
              minLength={3}
              maxLength={500}
              data-testid="input-revert-note"
            />
            <p className="text-xs text-muted-foreground">
              En az 3 karakter zorunlu. Bu not geçmiş kayıtlarında görünecek.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRevertTarget(null); setRevertNote(""); }}
              disabled={revertMutation.isPending}
              data-testid="button-cancel-revert"
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={() => revertMutation.mutate()}
              disabled={revertMutation.isPending || revertNote.trim().length < 3}
              data-testid="button-confirm-revert"
            >
              <Undo2 className="w-3 h-3" />
              {revertMutation.isPending ? "Çevriliyor..." : "Bekleyene döndür"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
