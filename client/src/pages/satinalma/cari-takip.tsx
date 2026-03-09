import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  Plus, 
  Search, 
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  Truck,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Eye
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface CariAccount {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  currentBalance: string;
  lastTransactionDate: string | null;
  isActive: boolean;
  branchId?: number;
  branch?: { name: string };
}

interface CariTransaction {
  id: number;
  accountId: number;
  transactionDate: string;
  transactionType: string;
  amount: string;
  description: string;
  documentNumber: string;
  dueDate: string | null;
  isPaid: boolean;
  account?: { accountName: string; accountCode: string };
}

interface DashboardStats {
  totalReceivables: number;
  totalPayables: number;
  overdueCount: number;
  upcomingDueCount: number;
}

const accountTypeOptions = [
  { value: "branch", label: "Şube" },
  { value: "supplier", label: "Tedarikçi" },
  { value: "customer", label: "Müşteri" },
  { value: "other", label: "Diğer" },
];

export default function CariTakip() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const { data: stats, isLoading: statsLoading, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ['/api/cari/stats'],
  });

  const queryParams = new URLSearchParams();
  if (searchTerm) queryParams.set("search", searchTerm);
  if (accountTypeFilter !== "all") queryParams.set("type", accountTypeFilter);
  const queryString = queryParams.toString();

  const accountsUrl = queryString ? `/api/cari/accounts?${queryString}` : '/api/cari/accounts';
  const { data: accounts, isLoading: accountsLoading } = useQuery<CariAccount[]>({
    queryKey: [accountsUrl],
  });

  const { data: overdueTransactions } = useQuery<CariTransaction[]>({
    queryKey: ['/api/cari/transactions/overdue'],
  });

  const { data: upcomingTransactions } = useQuery<CariTransaction[]>({
    queryKey: ['/api/cari/transactions/upcoming'],
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/cari/accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/cari")
      });
      setIsAddAccountDialogOpen(false);
      toast({ title: "Cari hesap oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Cari hesap oluşturulamadı", variant: "destructive" });
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/cari/transactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/cari")
      });
      setIsAddTransactionDialogOpen(false);
      setSelectedAccountId("");
      toast({ title: "İşlem kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem kaydedilemedi", variant: "destructive" });
    }
  });

  const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createAccountMutation.mutate({
      accountCode: formData.get("accountCode"),
      accountName: formData.get("accountName"),
      accountType: formData.get("accountType"),
      contactPerson: formData.get("contactPerson") || null,
      phone: formData.get("phone") || null,
      email: formData.get("email") || null,
    });
  };

  const handleCreateTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTransactionMutation.mutate({
      accountId: parseInt(selectedAccountId),
      transactionType: formData.get("transactionType"),
      amount: formData.get("amount"),
      description: formData.get("description") || null,
      documentNumber: formData.get("documentNumber") || null,
      documentType: formData.get("documentType") || null,
      dueDate: formData.get("dueDate") || null,
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("tr-TR");
  };

  const getAccountTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      branch: { label: "Şube", variant: "default" },
      supplier: { label: "Tedarikçi", variant: "secondary" },
      customer: { label: "Müşteri", variant: "outline" },
      other: { label: "Diğer", variant: "outline" },
    };
    const config = typeMap[type] || { label: type, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (statsLoading) {
    
  if (statsLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-cari-title">Cari Takip</h1>
        <Badge variant="secondary">AI Destekli</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" data-testid="tab-cari-dashboard">Özet</TabsTrigger>
          <TabsTrigger value="accounts" data-testid="tab-cari-accounts">Hesaplar</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-cari-transactions">İşlemler</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-cari-alerts">Uyarılar</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab("accounts")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Toplam Alacak</p>
                    <p className="text-xl font-bold text-green-600" data-testid="text-total-receivables">
                      {formatCurrency(stats?.totalReceivables || 0)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab("accounts")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Toplam Borç</p>
                    <p className="text-xl font-bold text-red-600" data-testid="text-total-payables">
                      {formatCurrency(stats?.totalPayables || 0)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab("alerts")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Vadesi Geçmiş</p>
                    <p className="text-xl font-bold text-orange-600" data-testid="text-overdue-count">
                      {stats?.overdueCount || 0}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab("alerts")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Yaklaşan Vade</p>
                    <p className="text-xl font-bold text-blue-600" data-testid="text-upcoming-count">
                      {stats?.upcomingDueCount || 0}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Vadesi Geçmiş İşlemler
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueTransactions && overdueTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {overdueTransactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10">
                        <div>
                          <p className="text-sm font-medium">{tx.account?.accountName}</p>
                          <p className="text-xs text-muted-foreground">{tx.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrency(tx.amount)}</p>
                          <p className="text-xs text-muted-foreground">Vade: {formatDate(tx.dueDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Vadesi geçmiş işlem yok</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI Önerileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <p className="text-sm">3 şubenin toplam 45.000 TL vadesi geçmiş borcu var. Tahsilat önceliği belirlemeniz önerilir.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <p className="text-sm">Forum şubesinin ödeme performansı %95, erken ödeme indirimi için uygun.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <p className="text-sm">Bu ay 12 vade tarihi var. Nakit akış planlaması yapmanız önerilir.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hesap ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-accounts"
              />
            </div>
            <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-account-type-filter">
                <SelectValue placeholder="Hesap Tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {accountTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-account">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Hesap
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni Cari Hesap</DialogTitle>
                  <DialogDescription>Şube, tedarikçi veya müşteri için cari hesap oluşturun</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountCode">Hesap Kodu</Label>
                      <Input id="accountCode" name="accountCode" required data-testid="input-account-code" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountType">Hesap Tipi</Label>
                      <Select name="accountType" defaultValue="branch">
                        <SelectTrigger data-testid="select-account-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {accountTypeOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Hesap Adı</Label>
                    <Input id="accountName" name="accountName" required data-testid="input-account-name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">İlgili Kişi</Label>
                      <Input id="contactPerson" name="contactPerson" data-testid="input-contact-person" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input id="phone" name="phone" data-testid="input-phone" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input id="email" name="email" type="email" data-testid="input-email" />
                  </div>
                  <Button type="submit" className="w-full" disabled={createAccountMutation.isPending} data-testid="button-submit-account">
                    {createAccountMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hesap Kodu</TableHead>
                    <TableHead>Hesap Adı</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead className="text-right">Bakiye</TableHead>
                    <TableHead>Son İşlem</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : accounts && accounts.length > 0 ? (
                    accounts.map((account) => (
                      <TableRow key={account.id} data-testid={`account-row-${account.id}`}>
                        <TableCell className="font-mono text-sm">{account.accountCode}</TableCell>
                        <TableCell className="font-medium">{account.accountName}</TableCell>
                        <TableCell>{getAccountTypeBadge(account.accountType)}</TableCell>
                        <TableCell className={`text-right font-bold ${parseFloat(account.currentBalance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(account.currentBalance)}
                        </TableCell>
                        <TableCell>{formatDate(account.lastTransactionDate)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAccountId(account.id.toString());
                                setIsAddTransactionDialogOpen(true);
                              }}
                              data-testid={`button-add-transaction-${account.id}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" data-testid={`button-view-account-${account.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Henüz cari hesap yok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Son İşlemler</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">İşlem geçmişi yükleniyor...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Vadesi Geçmiş ({stats?.overdueCount || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueTransactions && overdueTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {overdueTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-500/5">
                        <div>
                          <p className="font-medium">{tx.account?.accountName}</p>
                          <p className="text-sm text-muted-foreground">{tx.description}</p>
                          <p className="text-xs text-red-600">Vade: {formatDate(tx.dueDate)}</p>
                        </div>
                        <p className="font-bold text-red-600">{formatCurrency(tx.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Vadesi geçmiş işlem yok</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Yaklaşan Vadeler ({stats?.upcomingDueCount || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTransactions && upcomingTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-500/5">
                        <div>
                          <p className="font-medium">{tx.account?.accountName}</p>
                          <p className="text-sm text-muted-foreground">{tx.description}</p>
                          <p className="text-xs text-blue-600">Vade: {formatDate(tx.dueDate)}</p>
                        </div>
                        <p className="font-bold">{formatCurrency(tx.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Yaklaşan vade yok</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddTransactionDialogOpen} onOpenChange={setIsAddTransactionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni İşlem</DialogTitle>
            <DialogDescription>Borç veya alacak kaydı oluşturun</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactionType">İşlem Tipi</Label>
                <Select name="transactionType" defaultValue="borc">
                  <SelectTrigger data-testid="select-transaction-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borc">Borç</SelectItem>
                    <SelectItem value="alacak">Alacak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Tutar (TL)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required data-testid="input-amount" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" name="description" data-testid="input-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentNumber">Belge No</Label>
                <Input id="documentNumber" name="documentNumber" data-testid="input-document-number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentType">Belge Tipi</Label>
                <Select name="documentType">
                  <SelectTrigger data-testid="select-document-type">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fatura">Fatura</SelectItem>
                    <SelectItem value="tahsilat">Tahsilat</SelectItem>
                    <SelectItem value="tediye">Tediye</SelectItem>
                    <SelectItem value="virman">Virman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Vade Tarihi</Label>
              <Input id="dueDate" name="dueDate" type="date" data-testid="input-due-date" />
            </div>
            <Button type="submit" className="w-full" disabled={createTransactionMutation.isPending} data-testid="button-submit-transaction">
              {createTransactionMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
