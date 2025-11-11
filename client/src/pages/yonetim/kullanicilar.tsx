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
import { Search, Upload, UserCog } from "lucide-react";
import type { User, Branch } from "@shared/schema";

export default function UserCRM() {
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string | null>(null);
  const [editBranch, setEditBranch] = useState<string | null>(null);

  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Build URL with query params for users query
  const buildUsersQueryUrl = () => {
    const params = new URLSearchParams();
    if (roleFilter) params.append("role", roleFilter);
    if (branchFilter) params.append("branchId", branchFilter);
    if (searchQuery) params.append("search", searchQuery);
    const queryString = params.toString();
    return queryString ? `/api/admin/users?${queryString}` : "/api/admin/users";
  };

  // Fetch users with filters - tuple queryKey for proper cache invalidation
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users', roleFilter, branchFilter, searchQuery],
    queryFn: async () => {
      const token = localStorage.getItem('dospresso_token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(buildUsersQueryUrl(), {
        headers,
      });

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return await res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, branchId }: { id: string; role?: string; branchId?: number | null }) =>
      apiRequest(`/api/admin/users/${id}`, "PATCH", { role, branchId }),
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
    mutationFn: async (csvUsers: any[]) =>
      apiRequest("/api/admin/users/bulk-import", "POST", { users: csvUsers }),
    onSuccess: (data: any) => {
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

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Kullanıcı Yönetimi</h1>
            <p className="text-muted-foreground">
              Tüm kullanıcıları görüntüle, filtrele ve toplu içe aktar
            </p>
          </div>
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
              <div className="space-y-4">
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

        <Card>
          <CardHeader>
            <CardTitle>Filtreler</CardTitle>
            <CardDescription>Kullanıcıları rol, şube veya ada göre filtrele</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="role-filter">Rol</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role-filter" data-testid="select-role-filter">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tümü</SelectItem>
                    <SelectItem value="hq_admin">HQ Admin</SelectItem>
                    <SelectItem value="hq_staff">HQ Staff</SelectItem>
                    <SelectItem value="accountant">Muhasebe</SelectItem>
                    <SelectItem value="hr_specialist">İK Uzmanı</SelectItem>
                    <SelectItem value="supervisor">Süpervizör</SelectItem>
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
                    <SelectItem value="">Tümü</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Listesi ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground">Yükleniyor...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Şube</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
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
                            <div className="space-y-4">
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
                                    <SelectItem value="supervisor">Süpervizör</SelectItem>
                                    <SelectItem value="barista">Barista</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-branch">Şube</Label>
                                <Select value={editBranch ?? undefined} onValueChange={setEditBranch}>
                                  <SelectTrigger id="edit-branch" data-testid="select-edit-branch">
                                    <SelectValue placeholder="Şube seç" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Yok</SelectItem>
                                    {branches.map(branch => (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
