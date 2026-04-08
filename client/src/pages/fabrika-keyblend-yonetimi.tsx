import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft, Plus, Lock, Eye, EyeOff, Trash2, AlertTriangle, Scale,
} from "lucide-react";

interface Keyblend {
  id: number;
  code: string;
  name: string;
  description?: string;
  totalWeight?: string;
  showToGm: boolean;
  show_to_gm?: boolean;
  isActive: boolean;
  is_active?: boolean;
}

interface KeyblendIngredient {
  id: number;
  name: string;
  amount: string;
  unit: string;
  isAllergen: boolean;
  is_allergen?: boolean;
  showToGm: boolean;
  show_to_gm?: boolean;
}

export default function FabrikaKeyblendYonetimi() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showIngredientDialog, setShowIngredientDialog] = useState(false);
  const [newKb, setNewKb] = useState({ code: "", name: "", description: "" });
  const [newIng, setNewIng] = useState({ name: "", amount: "", unit: "gr", isAllergen: false });

  const canManage = ["admin", "recete_gm"].includes(user?.role || "");
  if (!canManage) {
    return (
      <div className="p-8 text-center">
        <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium">Keyblend yönetimine erişim yetkiniz yok</p>
        <p className="text-sm text-muted-foreground mt-1">Sadece Admin ve Reçete Gıda Mühendisi erişebilir</p>
      </div>
    );
  }

  const { data: keyblends = [] } = useQuery<Keyblend[]>({
    queryKey: ["/api/factory/keyblends"],
  });

  const { data: ingredients = [] } = useQuery<KeyblendIngredient[]>({
    queryKey: ["/api/factory/keyblends", selectedId, "ingredients"],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await fetch(`/api/factory/keyblends/${selectedId}/ingredients`, { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/factory/keyblends", newKb),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/factory/keyblends"] });
      setShowNewDialog(false);
      setNewKb({ code: "", name: "", description: "" });
      toast({ title: "Keyblend oluşturuldu" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const addIngredientMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/factory/keyblends/${selectedId}/ingredients`, {
      ...newIng,
      amount: parseFloat(newIng.amount),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/factory/keyblends", selectedId, "ingredients"] });
      qc.invalidateQueries({ queryKey: ["/api/factory/keyblends"] });
      setShowIngredientDialog(false);
      setNewIng({ name: "", amount: "", unit: "gr", isAllergen: false });
      toast({ title: "Bileşen eklendi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const selected = keyblends.find(k => k.id === selectedId);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/fabrika/receteler")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Keyblend Yönetimi</h1>
          <p className="text-sm text-muted-foreground">Gizli formül tanımları — sadece Admin ve Reçete GM erişir</p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Yeni Keyblend
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-4">
        {/* Sol: Keyblend listesi */}
        <div className="space-y-2">
          {keyblends.length === 0 ? (
            <Card><CardContent className="p-4 text-center text-muted-foreground text-sm">Henüz keyblend yok</CardContent></Card>
          ) : keyblends.map(kb => (
            <Card
              key={kb.id}
              className={`cursor-pointer transition-all ${selectedId === kb.id ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
              onClick={() => setSelectedId(kb.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">{kb.code}</div>
                    <div className="text-sm font-medium">{kb.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{kb.totalWeight || kb.totalWeight}gr</div>
                    {(kb.showToGm || kb.show_to_gm) ? (
                      <Badge variant="outline" className="text-[10px]"><Eye className="w-3 h-3 mr-0.5" />GM görür</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]"><EyeOff className="w-3 h-3 mr-0.5" />Gizli</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sağ: Seçili keyblend detayı */}
        <div>
          {!selected ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Detay görmek için sol listeden bir keyblend seçin</p>
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <span className="font-mono text-purple-600 dark:text-purple-400 mr-2">{selected.code}</span>
                    {selected.name}
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowIngredientDialog(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Bileşen Ekle
                  </Button>
                </div>
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ingredients.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Henüz bileşen eklenmedi</p>
                  ) : ingredients.map((ing, idx) => (
                    <div key={ing.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{ing.name}</span>
                        {(ing.isAllergen || ing.is_allergen) && (
                          <Badge variant="destructive" className="text-[10px] py-0">
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> Alerjen
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-mono font-bold">
                        {ing.amount} {ing.unit}
                      </div>
                    </div>
                  ))}
                </div>
                {ingredients.length > 0 && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-sm font-semibold">Toplam Ağırlık:</span>
                    <span className="text-lg font-mono font-bold">
                      {ingredients.reduce((sum, i) => sum + Number(i.amount || 0), 0).toFixed(1)} gr
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Yeni Keyblend Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Keyblend Oluştur</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kod</Label>
              <Input placeholder="KB-D01" value={newKb.code} onChange={e => setNewKb(p => ({ ...p, code: e.target.value }))} />
            </div>
            <div>
              <Label>İsim</Label>
              <Input placeholder="Donut Premix" value={newKb.name} onChange={e => setNewKb(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea placeholder="İsteğe bağlı açıklama" value={newKb.description} onChange={e => setNewKb(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>İptal</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newKb.code || !newKb.name || createMutation.isPending}>
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni Bileşen Dialog */}
      <Dialog open={showIngredientDialog} onOpenChange={setShowIngredientDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bileşen Ekle — {selected?.code}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Malzeme Adı</Label>
              <Input placeholder="DATEM (E472e)" value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Miktar</Label>
                <Input type="number" step="0.01" placeholder="15" value={newIng.amount} onChange={e => setNewIng(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Birim</Label>
                <Input placeholder="gr" value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newIng.isAllergen} onCheckedChange={v => setNewIng(p => ({ ...p, isAllergen: v }))} />
              <Label>Bu bileşen alerjen içerir</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIngredientDialog(false)}>İptal</Button>
            <Button onClick={() => addIngredientMutation.mutate()} disabled={!newIng.name || !newIng.amount || addIngredientMutation.isPending}>
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
