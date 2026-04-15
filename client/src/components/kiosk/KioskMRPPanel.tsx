/**
 * Kiosk Üretim Malzeme Paneli
 * MRP günlük plan ile kiosk entegrasyonu
 * 
 * Gösterir:
 * - Bugünkü malzeme çekme durumu (teslim alınan / bekleyen)
 * - Dünden artan malzeme uyarısı
 * - "Teslim Aldım" ve "Artan Kayıt" butonları
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, CheckCircle, Clock, AlertTriangle, Scale, Thermometer } from "lucide-react";

interface KioskMRPPanelProps {
  userId: string;
  userRole: string;
  kioskToken?: string;
}

const VERIFY_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "sef", "fabrika_operator", "fabrika_sorumlu", "fabrika_personel"];
const LEFTOVER_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "sef", "fabrika_operator", "fabrika_sorumlu"];

export function KioskMRPPanel({ userId, userRole, kioskToken }: KioskMRPPanelProps) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const [showLeftoverForm, setShowLeftoverForm] = useState(false);
  const canVerify = VERIFY_ROLES.includes(userRole);
  const canRecordLeftover = LEFTOVER_ROLES.includes(userRole);

  // Bugünkü MRP planı
  const { data: planData } = useQuery<any>({
    queryKey: ["/api/mrp/daily-plan", today],
    queryFn: async () => {
      const r = await fetch(`/api/mrp/daily-plan/${today}`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    refetchInterval: 60000,
  });

  // Dünden artan malzemeler
  const { data: yesterdayLeftovers = [] } = useQuery<any[]>({
    queryKey: ["/api/mrp/leftovers", yesterday],
    queryFn: async () => {
      const r = await fetch(`/api/mrp/leftovers/${yesterday}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  // Teslim alma mutation
  const verifyMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const r = await fetch(`/api/mrp/plan-items/${itemId}/verify`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error("Teslim alma başarısız");
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mrp/daily-plan"] }),
  });

  // Artan kayıt mutation
  const leftoverMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const r = await fetch("/api/mrp/leftovers", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordDate: today, items }),
      });
      if (!r.ok) throw new Error("Kayıt başarısız");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mrp/leftovers"] });
      setShowLeftoverForm(false);
    },
  });

  const plan = planData?.plan;
  const items: any[] = planData?.items || [];
  const pickedItems = items.filter(i => i.status === "picked");
  const verifiedItems = items.filter(i => i.status === "verified");
  const pendingItems = items.filter(i => i.status === "pending");
  const activeLeftovers = yesterdayLeftovers.filter((l: any) => 
    (l.condition === "good" || l.condition === "marginal") && !l.used_in_next_day
  );

  // Plan yoksa hiçbir şey gösterme
  if (!plan && activeLeftovers.length === 0) return null;

  return (
    <div className="bg-slate-700/30 rounded-lg p-3 space-y-3" data-testid="mrp-material-panel">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-300">Üretim Malzeme</span>
        </div>
        {plan && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
            {verifiedItems.length}/{items.length} teslim
          </span>
        )}
      </div>

      {/* Dünden artan uyarı */}
      {activeLeftovers.length > 0 && (
        <div className="bg-amber-500/10 rounded-md p-2 border border-amber-500/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-300">Dünden Artan ({activeLeftovers.length} kalem)</span>
          </div>
          <div className="space-y-1">
            {activeLeftovers.slice(0, 4).map((lo: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{lo.inventory_name || lo.inventoryName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 font-medium">
                    {Number(lo.remaining_quantity || lo.remainingQuantity || 0).toLocaleString("tr-TR")} {lo.unit}
                  </span>
                  <span className={`px-1 rounded text-[9px] ${
                    lo.condition === "good" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {lo.condition === "good" ? "İyi" : "Sınırda"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Malzeme çekme durumu */}
      {plan && items.length > 0 && (
        <div className="space-y-1.5">
          {/* Bekleyen — teslim alınacak */}
          {pickedItems.length > 0 && canVerify && (
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Teslim Bekleyen</span>
              {pickedItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between bg-blue-500/10 rounded px-2 py-1.5 border border-blue-500/20">
                  <div>
                    <span className="text-xs text-slate-200">{item.inventory_name || item.inventoryName}</span>
                    <span className="text-[10px] text-blue-400 ml-2">
                      {Number(item.net_pick_quantity || item.netPickQuantity || 0).toLocaleString("tr-TR")} {item.unit}
                    </span>
                  </div>
                  <button
                    onClick={() => verifyMutation.mutate(item.id)}
                    disabled={verifyMutation.isPending}
                    className="text-[10px] px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                  >
                    <CheckCircle className="h-3 w-3 inline mr-0.5" /> Teslim
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Özet satır */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
            {pendingItems.length > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-400" />
                {pendingItems.length} depodan bekleniyor
              </span>
            )}
            {verifiedItems.length > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-400" />
                {verifiedItems.length} teslim alındı
              </span>
            )}
          </div>
        </div>
      )}

      {/* Artan Kayıt butonu */}
      {canRecordLeftover && plan && (
        <div className="pt-1">
          {!showLeftoverForm ? (
            <button
              onClick={() => setShowLeftoverForm(true)}
              className="w-full text-xs py-2 rounded bg-slate-600/50 hover:bg-slate-600 text-slate-300 font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Scale className="h-3.5 w-3.5" /> Artan Malzeme Tartımı
            </button>
          ) : (
            <KioskLeftoverForm
              items={verifiedItems}
              date={today}
              onSave={(data) => leftoverMutation.mutate(data)}
              onCancel={() => setShowLeftoverForm(false)}
              isPending={leftoverMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Basit Tartım Formu ──
function KioskLeftoverForm({ items, date, onSave, onCancel, isPending }: {
  items: any[];
  date: string;
  onSave: (data: any[]) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [entries, setEntries] = useState<Array<{
    inventoryId: number; name: string; quantity: string; unit: string; condition: string; temp: string;
  }>>(
    items.map(i => ({
      inventoryId: i.inventory_id || i.inventoryId,
      name: i.inventory_name || i.inventoryName || "?",
      quantity: "",
      unit: i.unit || "g",
      condition: "good",
      temp: "",
    }))
  );

  const handleSave = () => {
    const valid = entries
      .filter(e => e.quantity && Number(e.quantity) > 0)
      .map(e => ({
        inventoryId: e.inventoryId,
        remainingQuantity: Number(e.quantity),
        unit: e.unit,
        condition: e.condition,
        storageTemp: e.temp ? Number(e.temp) : null,
      }));
    if (valid.length > 0) onSave(valid);
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-2.5 space-y-2 border border-slate-600/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">
          <Scale className="h-3.5 w-3.5 inline mr-1" />
          Artan Tartım ({date})
        </span>
        <button onClick={onCancel} className="text-[10px] text-slate-400 hover:text-slate-200">İptal</button>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-slate-700/50 rounded px-2 py-1.5">
            <span className="text-[10px] text-slate-300 flex-1 truncate">{entry.name}</span>
            <input
              type="number"
              placeholder="gram"
              value={entry.quantity}
              onChange={e => {
                const n = [...entries];
                n[idx].quantity = e.target.value;
                setEntries(n);
              }}
              className="w-16 h-6 text-[10px] rounded bg-slate-800 border border-slate-600 px-1.5 text-slate-200 text-right"
            />
            <select
              value={entry.condition}
              onChange={e => {
                const n = [...entries];
                n[idx].condition = e.target.value;
                setEntries(n);
              }}
              className="h-6 text-[10px] rounded bg-slate-800 border border-slate-600 px-1 text-slate-200"
            >
              <option value="good">İyi</option>
              <option value="marginal">Sınırda</option>
              <option value="unusable">Kullanılamaz</option>
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || entries.every(e => !e.quantity)}
        className="w-full text-xs py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium transition-colors"
      >
        <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
        {entries.filter(e => e.quantity && Number(e.quantity) > 0).length} kalem kaydet
      </button>
    </div>
  );
}
