import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MobileFilterCollapsible } from "@/components/mobile-filter-collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, UserCog, Download, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { User, Branch } from "@shared/schema";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

export default function UserCRM() {
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"name" | "email" | "role" | "createdAt">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string | null>(null);
  const [editBranch, setEditBranch] = useState<string | null>(null);

  // Fetch branches
  const { data: branches = [], isError, refetch, isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    staleTime: 300000,
  });

  // Build URL with query params for users query
  const buildUsersQueryUrl = () => {
    const params = new URLSearchParams();
    if (roleFilter && roleFilter !== "all") params.append("role", roleFilter);
    if (branchFilter && branchFilter !== "all") params.append("branchId", branchFilter);
    if (accountStatusFilter && accountStatusFilter !== "all") params.append("accountStatus", accountStatusFilter);
    if (searchQuery) params.append("search", searchQuery);
    const queryString = params.toString();
    return queryString ? `/api/admin/users?${queryString}` : "/api/admin/users";
  };

  // Fetch users with filters - tuple queryKey for proper cache invalidation
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users', roleFilter, branchFilter, accountStatusFilter, searchQuery],
    queryFn: async () => {
      const res = await fetch(buildUsersQueryUrl(), {
        credentials: 'include',
      });

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return await res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Client-side sorting and pagination
  const sortedUsers = [...allUsers].sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;

    if (sortField === "name") {
      aValue = `${a.firstName} ${a.lastName}`.toLocaleLowerCase('tr-TR');
      bValue = `${b.firstName} ${b.lastName}`.toLocaleLowerCase('tr-TR');
    } else if (sortField === "email") {
      aValue = (a.email || "").toLocaleLowerCase('tr-TR');
      bValue = (b.email || "").toLocaleLowerCase('tr-TR');
    } else if (sortField === "role") {
      aValue = a.role.toLocaleLowerCase('tr-TR');
      bValue = b.role.toLocaleLowerCase('tr-TR');
    } else {
      aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, branchFilter, accountStatusFilter, searchQuery, itemsPerPage]);

  // Toggle sort
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Ad", "Soyad", "Email", "Rol", "Şube", "Durum", "Kayıt Tarihi"];
    const rows = sortedUsers.map(user => [
      user.id,
      user.firstName,
      user.lastName,
      user.email,
      user.role,
      user.branchId ? branches.find(b => b.id === user.branchId)?.name || "" : "",
      user.accountStatus,
      user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `kullanicilar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Başarılı", description: `${sortedUsers.length} kullanıcı CSV'ye aktarıldı` });
  };

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, branchId }: { id: string; role?: string; branchId?: number | null }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, { role, branchId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Başarılı", description: "Kullanıcı güncellendi" });
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Kullanıcı güncellenemedi", variant: "destructive" });
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (csvUsers: any[]) => {
      const res = await apiRequest("POST", "/api/admin/users/bulk-import", { users: csvUsers });
      return res.json() as Promise<{ imported: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ 
        title: "Başarılı", 
        description: `${data.imported} kullanıcı içe aktarıldı` 
      });
      setCsvDialogOpen(false);
      setCsvText("");
    },
    onError: () => {
      toast({ title: "Hata", description: "İçe aktarma başarısız", variant: "destructive" });
    },
  });

  const handleCsvImport = () => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length === 0) {
        toast({ title: "Hata", description: "CSV boş", variant: "destructive" });
        return;
      }

      // Parse CSV (expects: id,firstName,lastName,email,role,branchId)
      const csvUsers = lines.slice(1).map(line => {
        const [id, firstName, lastName, email, role, branchId] = line.split(',').map(s => s.trim());
        return {
          id,
          firstName,
          lastName,
          email,
          role,
          branchId: branchId ? parseInt(branchId) : null,
          profileImageUrl: null,
        };
      });

      bulkImportMutation.mutate(csvUsers);
    } catch (error) {
      toast({ title: "Hata", description: "CSV formatı hatalı", variant: "destructive" });
    }
  };

  const handleUpdateUser = () => {
    if (!editingUser || !editRole || editBranch === null) return;

    const updates: { role: string; branchId: number | null } = {
      role: editRole,
      branchId: editBranch ? parseInt(editBranch) : null,
    };

    updateUserMutation.mutate({ id: editingUser.id, ...updates });
  };

  const getRoleBadgeVariant = (role: string) => {
    const hqRoles = ["hq_admin", "hq_staff", "accountant", "hr_specialist"];
    return hqRoles.includes(role) ? "default" : "secondary";
  };

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Kullanıcı Yönetimi</h1>
            <p className="text-muted-foreground">
              Tüm kullanıcıları görüntüle, filtrele ve toplu içe/dışa aktar
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              data-testid="button-export-csv"
              onClick={handleExportCSV}
              disabled={sortedUsers.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV Dışa Aktar
            </Button>
            <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-open-csv-import">
                  <Upload className="mr-2 h-4 w-4" />
                  CSV İçe Aktar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>CSV İçe Aktarma</DialogTitle>
                  <DialogDescription>
                    Format: id,firstName,lastName,email,role,branchId
                  </DialogDescription>
                </DialogHeader>
                <div className="w-full space-y-2 sm:space-y-3">
                  <div>
                    <Label htmlFor="csv-text">CSV Verisi</Label>
                    <textarea
                      id="csv-text"
                      data-testid="input-csv-text"
                      className="w-full h-64 p-2 border rounded-md font-mono text-sm"
                      placeholder="id,firstName,lastName,email,role,branchId&#10;user1,John,Doe,john@example.com,barista,1"
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                    />
                  </div>
                  <Button
                    data-testid="button-submit-csv-import"
                    onClick={handleCsvImport}
                    disabled={bulkImportMutation.isPending || !csvText.trim()}
                    className="w-full"
                  >
                    {bulkImportMutation.isPending ? "İçe Aktarılıyor..." : "İçe Aktar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="hidden md:block">Filtreler</CardTitle>
            <CardDescription className="hidden md:block">Kullanıcıları rol, şube veya ada göre filtrele</CardDescription>
          </CardHeader>
          <CardContent>
            <MobileFilterCollapsible activeFilterCount={(roleFilter !== "all" ? 1 : 0) + (branchFilter !== "all" ? 1 : 0) + (accountStatusFilter !== "all" ? 1 : 0) + (searchQuery ? 1 : 0)}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              <div>
                <Label htmlFor="role-filter">Rol</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role-filter" data-testid="select-role-filter">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="hq_admin">HQ Admin</SelectItem>
                    <SelectItem value="hq_staff">HQ Staff</SelectItem>
                    <SelectItem value="accountant">Muhasebe</SelectItem>
                    <SelectItem value="hr_specialist">İK Uzmanı</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="branch-filter">Şube</Label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger id="branch-filter" data-testid="select-branch-filter">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {(Array.isArray(branches) ? branches : []).map(branch => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status-filter">Hesap Durumu</Label>
                <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                  <SelectTrigger id="status-filter" data-testid="select-status-filter">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="approved">Onaylandı</SelectItem>
                    <SelectItem value="pending">Beklemede</SelectItem>
                    <SelectItem value="rejected">Reddedildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="search-query">Ara</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-query"
                    data-testid="input-search-users"
                    placeholder="İsim, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            </MobileFilterCollapsible>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <div>
              <CardTitle>Kullanıcı Listesi ({sortedUsers.length})</CardTitle>
              <CardDescription className="mt-1">
                Sayfa {currentPage} / {totalPages} · {itemsPerPage} kayıt/sayfa
              </CardDescription>
            </div>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
              <SelectTrigger className="w-32" data-testid="select-items-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / sayfa</SelectItem>
                <SelectItem value="25">25 / sayfa</SelectItem>
                <SelectItem value="50">50 / sayfa</SelectItem>
                <SelectItem value="100">100 / sayfa</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground">Yükleniyor...</p>
            ) : sortedUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Kullanıcı bulunamadı</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover-elevate -ml-3 h-8"
                          onClick={() => handleSort("name")}
                          data-testid="button-sort-name"
                        >
                          Ad Soyad
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover-elevate -ml-3 h-8"
                          onClick={() => handleSort("email")}
                          data-testid="button-sort-email"
                        >
                          Email
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover-elevate -ml-3 h-8"
                          onClick={() => handleSort("role")}
                          data-testid="button-sort-role"
                        >
                          Rol
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Şube</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell data-testid={`text-email-${user.id}`}>
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} data-testid={`badge-role-${user.id}`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-branch-${user.id}`}>
                        {user.branchId ? branches.find(b => b.id === user.branchId)?.name : "—"}
                      </TableCell>
                      <TableCell data-testid={`text-status-${user.id}`}>
                        <Badge 
                          variant={
                            user.accountStatus === "approved" ? "default" :
                            user.accountStatus === "pending" ? "secondary" :
                            "destructive"
                          }
                        >
                          {user.accountStatus === "approved" ? "Onaylandı" :
                           user.accountStatus === "pending" ? "Beklemede" :
                           "Reddedildi"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => {
                          if (!open) {
                            setEditingUser(null);
                            setEditRole(null);
                            setEditBranch(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              data-testid={`button-edit-${user.id}`}
                              onClick={() => {
                                setEditRole(user.role);
                                setEditBranch(user.branchId?.toString() || "");
                                setEditingUser(user);
                              }}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Kullanıcı Düzenle</DialogTitle>
                              <DialogDescription>
                                {user.firstName} {user.lastName} için rol ve şube değiştir
                              </DialogDescription>
                            </DialogHeader>
                            <div className="w-full space-y-2 sm:space-y-3">
                              <div>
                                <Label htmlFor="edit-role">Rol</Label>
                                <Select value={editRole ?? undefined} onValueChange={setEditRole}>
                                  <SelectTrigger id="edit-role" data-testid="select-edit-role">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="hq_admin">HQ Admin</SelectItem>
                                    <SelectItem value="hq_staff">HQ Staff</SelectItem>
                                    <SelectItem value="accountant">Muhasebe</SelectItem>
                                    <SelectItem value="hr_specialist">İK Uzmanı</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="barista">Barista</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-branch">Şube</Label>
                                <Select value={editBranch === null ? "none" : (editBranch ?? "none")} onValueChange={(val) => setEditBranch(val === "none" ? null : val)}>
                                  <SelectTrigger id="edit-branch" data-testid="select-edit-branch">
                                    <SelectValue placeholder="Şube seç" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Yok</SelectItem>
                                    {(Array.isArray(branches) ? branches : []).map(branch => (
                                      <SelectItem key={branch.id} value={branch.id.toString()}>
                                        {branch.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                data-testid="button-save-user-edit"
                                onClick={handleUpdateUser}
                                disabled={updateUserMutation.isPending || !editRole || editBranch === null}
                                className="w-full"
                              >
                                {updateUserMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {sortedUsers.length > 0 ? (
                      <>
                        {startIndex + 1}-{Math.min(endIndex, sortedUsers.length)} / {sortedUsers.length} kayıt
                      </>
                    ) : (
                      "0 kayıt"
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Önceki
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            data-testid={`button-page-${pageNum}`}
                            className="w-8 h-8"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      data-testid="button-next-page"
                    >
                      Sonraki
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
