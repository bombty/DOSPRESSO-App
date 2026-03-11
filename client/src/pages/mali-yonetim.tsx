import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatTurkishDate } from "@/lib/turkish-labels";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Percent, Package, Users, AlertTriangle,
  Plus, Loader2, ArrowUpRight, ArrowDownRight, Flame, ShoppingCart, Building2, Eye
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, Area, AreaChart
} from "recharts";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('tr-TR').format(v);
const MONTHS = [
  { value: 1, label: "Ocak" }, { value: 2, label: "Şubat" }, { value: 3, label: "Mart" },
  { value: 4, label: "Nisan" }, { value: 5, label: "Mayıs" }, { value: 6, label: "Haziran" },
  { value: 7, label: "Temmuz" }, { value: 8, label: "Ağustos" }, { value: 9, label: "Eylül" },
  { value: 10, label: "Ekim" }, { value: 11, label: "Kasım" }, { value: 12, label: "Aralık" },
];
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function KpiCard({ title, value, prev, trend, icon: Icon, color, testId }: any) {
  const diff = trend !== undefined ? trend : (prev ? ((value - prev) / Math.abs(prev || 1)) * 100 : 0);
  const up = diff >= 0;
  const showTrend = trend !== undefined || prev !== undefined;

  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="text-xs text-muted-foreground">{title}</span>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className="text-lg font-bold mt-1" data-testid={`${testId}-value`}>{typeof value === 'string' ? value : fmt(value)}</p>
        {showTrend && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>%{Math.abs(diff).toFixed(1)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardTab({ year, month }: { year: number; month: number }) {
  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['/api/financial/dashboard', year, month],
    queryFn: async () => {
      const res = await fetch(`/api/financial/dashboard?year=${year}&month=${month}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Dashboard yüklenemedi');
      return res.json();
    },
  });

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (!data) return <p className="text-sm text-muted-foreground p-4">Veri bulunamadı</p>;

  const d = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Toplam Gelir" value={d?.summary?.totalRevenue || 0} trend={d?.summary?.revenueTrend} icon={TrendingUp} color="text-emerald-600" testId="kpi-revenue" />
        <KpiCard title="Toplam Gider" value={d?.summary?.totalExpenses || 0} trend={d?.summary?.expenseTrend} icon={TrendingDown} color="text-red-500" testId="kpi-expense" />
        <KpiCard title="Net Kar" value={d?.summary?.netProfit || 0} trend={d?.summary?.profitTrend} icon={DollarSign} color="text-blue-600" testId="kpi-profit" />
        <KpiCard title="Kar Marjı %" value={`%${(d?.summary?.profitMargin || 0).toFixed(1)}`} icon={Percent} color="text-purple-600" testId="kpi-margin" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">6 Aylık Gelir/Gider Trendi</CardTitle></CardHeader>
          <CardContent>
            {d?.monthlyTrend && d.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v: string) => formatTurkishDate(v)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98130" name="Gelir" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef444430" name="Gider" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Trend verisi yok</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Gider Dağılımı</CardTitle></CardHeader>
          <CardContent>
            {d?.categoryBreakdown && d.categoryBreakdown.length > 0 ? (() => {
              const pieData = d.categoryBreakdown.map((c: any) => ({ name: c.category, value: c.amount }));
              return (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} %${(percent * 100).toFixed(0)}`}>
                    {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              );
            })() : <p className="text-sm text-muted-foreground text-center py-8">Gider verisi yok</p>}
          </CardContent>
        </Card>
      </div>

      {d?.branchBreakdown && d.branchBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Şube Kar/Zarar (Top 10)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Şube</TableHead>
                  <TableHead className="text-right">Gelir</TableHead>
                  <TableHead className="text-right">Gider</TableHead>
                  <TableHead className="text-right">Kar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.branchBreakdown.slice(0, 10).map((b: any, i: number) => (
                  <TableRow key={i} data-testid={`row-branch-pnl-${i}`}>
                    <TableCell className="font-medium">{b.branchName}</TableCell>
                    <TableCell className="text-right text-emerald-600">{fmt(b.revenue || 0)}</TableCell>
                    <TableCell className="text-right text-red-500">{fmt(b.expenses || 0)}</TableCell>
                    <TableCell className={`text-right font-semibold ${(b.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(b.netProfit || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecordsTab({ year, month }: { year: number; month: number }) {
  const { toast } = useToast();
  const [filterMonth, setFilterMonth] = useState(month);
  const [filterType, setFilterType] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ date: '', branchId: '', type: 'gelir', category: '', description: '', amount: '' });

  const qp = new URLSearchParams({ year: String(year), month: String(filterMonth) });
  if (filterType !== 'all') qp.set('type', filterType);
  if (filterBranch !== 'all') qp.set('branchId', filterBranch);
  if (filterCategory !== 'all') qp.set('category', filterCategory);

  const { data: records = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/financial/records', year, filterMonth, filterType, filterBranch, filterCategory],
    queryFn: async () => {
      const res = await fetch(`/api/financial/records?${qp.toString()}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: categoriesData } = useQuery<any>({
    queryKey: ['/api/financial/expense-categories'],
  });
  const categories = categoriesData ? [...(categoriesData.gelir || []), ...(categoriesData.gider || [])] : [];

  const { data: branches = [] } = useQuery<any[]>({ queryKey: ['/api/branches'] });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", '/api/financial/records', {
        recordDate: form.date,
        branchId: form.branchId ? Number(form.branchId) : null,
        type: form.type,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
      });
    },
    onSuccess: () => {
      toast({ title: "Kayıt eklendi" });
      setDialogOpen(false);
      setForm({ date: '', branchId: '', type: 'gelir', category: '', description: '', amount: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/records'] });
    },
    onError: () => { toast({ title: "Kayıt eklenemedi", variant: "destructive" }); },
  });

  const totalGelir = records.filter((r: any) => r.type === 'gelir').reduce((s: number, r: any) => s + (parseFloat(r.amount) || 0), 0);
  const totalGider = records.filter((r: any) => r.type === 'gider').reduce((s: number, r: any) => s + (parseFloat(r.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Toplam Gelir</p><p className="text-lg font-bold text-emerald-600" data-testid="text-records-gelir">{fmt(totalGelir)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Toplam Gider</p><p className="text-lg font-bold text-red-500" data-testid="text-records-gider">{fmt(totalGider)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Net</p><p className={`text-lg font-bold ${totalGelir - totalGider >= 0 ? 'text-emerald-600' : 'text-red-500'}`} data-testid="text-records-net">{fmt(totalGelir - totalGider)}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Ay</Label>
          <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
            <SelectTrigger className="w-[100px]" data-testid="select-records-month"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tür</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[100px]" data-testid="select-records-type"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tümü</SelectItem><SelectItem value="gelir">Gelir</SelectItem><SelectItem value="gider">Gider</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Şube</Label>
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-[120px]" data-testid="select-records-branch"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {branches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kategori</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[120px]" data-testid="select-records-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {categories.map((c: any) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-record"><Plus className="h-4 w-4 mr-1" />Ekle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Kayıt</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Tarih</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} data-testid="input-record-date" /></div>
              <div className="space-y-1">
                <Label>Şube</Label>
                <Select value={form.branchId} onValueChange={v => setForm({ ...form, branchId: v })}>
                  <SelectTrigger data-testid="select-record-branch"><SelectValue placeholder="Şube seçin" /></SelectTrigger>
                  <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tür</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v, category: '' })}>
                  <SelectTrigger data-testid="select-record-type"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gelir">Gelir</SelectItem><SelectItem value="gider">Gider</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="select-record-category"><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                  <SelectContent>
                    {(form.type === 'gelir' ? (categoriesData?.gelir || []) : (categoriesData?.gider || [])).map((c: any) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Açıklama</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="input-record-description" /></div>
              <div className="space-y-1"><Label>Tutar (TL)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} data-testid="input-record-amount" /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.date || !form.amount} data-testid="button-save-record">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Skeleton className="h-48" /> : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Şube</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Kayıt bulunamadı</TableCell></TableRow>
                ) : records.map((r: any, i: number) => (
                  <TableRow key={r.id || i} data-testid={`row-record-${i}`}>
                    <TableCell className="text-sm">{r.recordDate ? new Date(r.recordDate).toLocaleDateString('tr-TR') : '-'}</TableCell>
                    <TableCell className="text-sm">{r.branchName || '-'}</TableCell>
                    <TableCell><Badge variant={r.type === 'gelir' ? 'default' : 'destructive'} className="text-xs">{r.type === 'gelir' ? 'Gelir' : 'Gider'}</Badge></TableCell>
                    <TableCell className="text-sm">{r.category || '-'}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.description || '-'}</TableCell>
                    <TableCell className={`text-right font-medium ${r.type === 'gelir' ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(parseFloat(r.amount) || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WasteTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ['/api/financial/waste-report'] });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <p className="text-sm text-muted-foreground p-4">Veri bulunamadı</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard title="Toplam Fire Maliyeti" value={data?.summary?.totalWasteCost || 0} icon={Flame} color="text-orange-500" testId="kpi-waste-cost" />
        <KpiCard title="Ortalama Fire/Batch" value={`${fmtNum(data?.summary?.averageWastePerBatch || 0)} kg`} icon={Package} color="text-amber-500" testId="kpi-waste-avg" />
        <KpiCard title="Toplam Batch" value={fmtNum(data?.summary?.totalBatches || 0)} icon={ShoppingCart} color="text-blue-500" testId="kpi-waste-batch" />
      </div>

      {data.monthlyTrend && data.monthlyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Aylık Fire Trendi</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v: string) => formatTurkishDate(v)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="wasteCost" fill="#f59e0b" name="Fire Maliyeti" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {data?.wasteByProduct && data.wasteByProduct.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">En Yüksek Fire - İlk 20 Ürün</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Fire (kg)</TableHead>
                  <TableHead className="text-right">Maliyet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.wasteByProduct.slice(0, 20).map((p: any, i: number) => (
                  <TableRow key={i} data-testid={`row-waste-${i}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell className="text-right">{fmtNum(p.wasteKg || 0)}</TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">{fmt(p.wasteCost || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProfitabilityTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ['/api/financial/product-profitability'] });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <p className="text-sm text-muted-foreground p-4">Veri bulunamadı</p>;

  const topProfit = (data?.mostProfitable || []).slice(0, 5);
  const lowProfit = (data?.leastProfitable || []).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard title="Toplam Ürün Sayısı" value={fmtNum(data?.totalProducts || 0)} icon={Package} color="text-blue-600" testId="kpi-product-count" />
        <KpiCard title="Ortalama Kar Marjı" value={`%${(data?.averageMargin || 0).toFixed(1)}`} icon={Percent} color="text-emerald-600" testId="kpi-avg-margin" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-600">En Çok Kazandıran</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topProfit.length === 0 ? <p className="text-sm text-muted-foreground">Veri yok</p> : topProfit.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between" data-testid={`row-top-profit-${i}`}>
                <span className="text-sm truncate flex-1">{p.productName}</span>
                <Badge variant="secondary" className="text-emerald-700 ml-2">%{(p.profitMargin || 0).toFixed(1)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-500">En Az Kazandıran</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lowProfit.length === 0 ? <p className="text-sm text-muted-foreground">Veri yok</p> : lowProfit.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between" data-testid={`row-low-profit-${i}`}>
                <span className="text-sm truncate flex-1">{p.productName}</span>
                <Badge variant="secondary" className="text-red-600 ml-2">%{(p.profitMargin || 0).toFixed(1)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {data.marginDistribution && data.marginDistribution.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Marj Dağılımı</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.marginDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Ürün Sayısı" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {data?.allProducts && data.allProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tüm Ürünler</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Maliyet</TableHead>
                  <TableHead className="text-right">Satış</TableHead>
                  <TableHead className="text-right">Kar</TableHead>
                  <TableHead className="text-right">Marj %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.allProducts.map((p: any, i: number) => (
                  <TableRow key={i} data-testid={`row-product-${i}`}>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell className="text-right">{fmt(p.unitCost || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(p.sellingPrice || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(p.profitPerUnit || 0)}</TableCell>
                    <TableCell className={`text-right font-semibold ${(p.profitMargin || 0) >= 30 ? 'text-emerald-600' : 'text-red-500'}`}>%{(p.profitMargin || 0).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InventoryTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ['/api/financial/inventory-cost'] });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <p className="text-sm text-muted-foreground p-4">Veri bulunamadı</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard title="Toplam Stok Değeri" value={data?.summary?.totalStockValue || 0} icon={DollarSign} color="text-blue-600" testId="kpi-stock-value" />
        <KpiCard title="Ürün Çeşidi" value={fmtNum(data?.summary?.totalItems || 0)} icon={Package} color="text-purple-600" testId="kpi-stock-items" />
        <KpiCard title="Düşük Stok Uyarıları" value={fmtNum(data?.summary?.lowStockCount || 0)} icon={AlertTriangle} color="text-orange-500" testId="kpi-low-stock" />
      </div>

      {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.categoryBreakdown.map((c: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground truncate">{c.category}</p>
                <p className="text-sm font-bold">{fmt(c.totalValue || 0)}</p>
                <p className="text-xs text-muted-foreground">{c.itemCount} ürün</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data.lowStockItems && data.lowStockItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-600">Düşük Stok Ürünleri</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Mevcut</TableHead>
                  <TableHead className="text-right">Minimum</TableHead>
                  <TableHead className="text-right">Eksik</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowStockItems.map((item: any, i: number) => (
                  <TableRow key={i} data-testid={`row-low-stock-${i}`}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{fmtNum(item.current || 0)}</TableCell>
                    <TableCell className="text-right">{fmtNum(item.minimum || 0)}</TableCell>
                    <TableCell className="text-right text-red-500 font-medium">{fmtNum(item.deficit || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data.highValueItems && data.highValueItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Yüksek Değerli Stoklar</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam Değer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.highValueItems.map((item: any, i: number) => (
                  <TableRow key={i} data-testid={`row-high-value-${i}`}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.unit || '-'}</TableCell>
                    <TableCell className="text-right">{fmt(item.unitPrice || 0)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.stockValue || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PersonnelTab({ year, month }: { year: number; month: number }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/financial/personnel-cost', year, month],
    queryFn: async () => {
      const res = await fetch(`/api/financial/personnel-cost?year=${year}&month=${month}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Personel maliyet verisi yüklenemedi');
      return res.json();
    },
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <p className="text-sm text-muted-foreground p-4">Veri bulunamadı</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="Toplam Personel" value={fmtNum(data?.summary?.totalEmployees || 0)} icon={Users} color="text-blue-600" testId="kpi-personnel-count" />
        <KpiCard title="Toplam Brüt" value={data?.summary?.totalGross || 0} icon={DollarSign} color="text-emerald-600" testId="kpi-personnel-gross" />
        <KpiCard title="Toplam Net" value={data?.summary?.totalNet || 0} icon={DollarSign} color="text-blue-500" testId="kpi-personnel-net" />
        <KpiCard title="SGK" value={data?.summary?.totalSgk || 0} icon={Building2} color="text-purple-600" testId="kpi-personnel-sgk" />
        <KpiCard title="Vergi" value={data?.summary?.totalTax || 0} icon={Percent} color="text-orange-500" testId="kpi-personnel-tax" />
      </div>

      {data?.roleDistribution && data.roleDistribution.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.roleDistribution.map((r: any, i: number) => (
            <Badge key={i} variant="secondary" data-testid={`badge-role-${i}`}>{r.role}: {r.count}</Badge>
          ))}
        </div>
      )}

      {data?.branchBreakdown && data.branchBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Şube Bazında Personel Maliyeti</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Şube</TableHead>
                  <TableHead className="text-right">Personel</TableHead>
                  <TableHead className="text-right">Brüt</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">SGK</TableHead>
                  <TableHead className="text-right">Vergi</TableHead>
                  <TableHead className="text-right">Toplam Maliyet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.branchBreakdown.map((b: any, i: number) => (
                  <TableRow key={i} data-testid={`row-personnel-branch-${i}`}>
                    <TableCell className="font-medium">{b.branchName}</TableCell>
                    <TableCell className="text-right">{b.employeeCount}</TableCell>
                    <TableCell className="text-right">{fmt(b.totalGross || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(b.totalNet || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(b.totalSgk || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(b.totalTax || 0)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(b.totalCost || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MaliYonetim() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold">Mali Yönetim</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]" data-testid="select-mali-year"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-[110px]" data-testid="select-mali-month"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full">
            <TabsTrigger value="dashboard" data-testid="tab-mali-dashboard" className="flex-1 min-w-[70px] text-xs px-2 py-1.5"><Eye className="h-3 w-3 mr-1 flex-shrink-0" /><span className="truncate">Genel</span></TabsTrigger>
            <TabsTrigger value="records" data-testid="tab-mali-records" className="flex-1 min-w-[70px] text-xs px-2 py-1.5"><DollarSign className="h-3 w-3 mr-1 flex-shrink-0" /><span className="truncate">Gelir-Gider</span></TabsTrigger>
            <TabsTrigger value="waste" data-testid="tab-mali-waste" className="flex-1 min-w-[70px] text-xs px-2 py-1.5"><Flame className="h-3 w-3 mr-1 flex-shrink-0" /><span className="truncate">Fire</span></TabsTrigger>
            <TabsTrigger value="profitability" data-testid="tab-mali-profitability" className="flex-1 min-w-[70px] text-xs px-2 py-1.5"><TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" /><span className="truncate">Karlılık</span></TabsTrigger>
            <TabsTrigger value="inventory" data-testid="tab-mali-inventory" className="flex-1 min-w-[70px] text-xs px-2 py-1.5"><Package className="h-3 w-3 mr-1 flex-shrink-0" /><span className="truncate">Stok</span></TabsTrigger>
            <TabsTrigger value="personnel" data-testid="tab-mali-personnel" className="flex-1 min-w-[70px] text-xs px-2 py-1.5"><Users className="h-3 w-3 mr-1 flex-shrink-0" /><span className="truncate">Personel</span></TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4"><DashboardTab year={year} month={month} /></TabsContent>
          <TabsContent value="records" className="mt-4"><RecordsTab year={year} month={month} /></TabsContent>
          <TabsContent value="waste" className="mt-4"><WasteTab /></TabsContent>
          <TabsContent value="profitability" className="mt-4"><ProfitabilityTab /></TabsContent>
          <TabsContent value="inventory" className="mt-4"><InventoryTab /></TabsContent>
          <TabsContent value="personnel" className="mt-4"><PersonnelTab year={year} month={month} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
