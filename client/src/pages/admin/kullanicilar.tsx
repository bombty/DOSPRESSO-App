import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  ArrowLeft, 
  Search, 
  MoreVertical, 
  Key, 
  UserX, 
  UserCheck,
  Mail,
  Building2,
  Shield,
  Factory,
  Store,
  Briefcase,
  Tag
} from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/turkish-labels";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/10 text-red-600 dark:text-red-400",
  muhasebe: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  teknik: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  destek: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  coach: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  satinalma: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  yatirimci_hq: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  fabrika: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  supervisor: "bg-green-500/10 text-green-600 dark:text-green-400",
  supervisor_buddy: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  barista: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const HQ_ROLES = ["admin", "muhasebe", "teknik", "destek", "coach", "satinalma", "yatirimci_hq"];
const FACTORY_ROLES = ["fabrika"];
const BRANCH_ROLES = ["supervisor", "supervisor_buddy", "barista"];

type CategoryFilter = "all" | "hq" | "fabrika" | "sube";

export default function AdminKullanicilar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [userDetailDialog, setUserDetailDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
  });

  const { data: employeeTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/employee-types/active"],
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest("POST", `/api/admin/users/${userId}/reset-password`, {}),
    onSuccess: () => {
      setResetPasswordDialog(false);
      setUserDetailDialog(false);
      toast({ title: "Şifre sıfırlandı", description: "Kullanıcıya e-posta gönderildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Şifre sıfırlanamadı", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserDetailDialog(false);
      toast({ title: "Kullanıcı durumu güncellendi" });
    },
  });

  const updateEmployeeTypeMutation = useMutation({
    mutationFn: ({ userId, employeeTypeId }: { userId: string; employeeTypeId: number | null }) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/employee-type`, { employeeTypeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Personel tipi güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Personel tipi güncellenemedi", variant: "destructive" });
    },
  });

  const getBranchName = (branchId: number | null) => {
    if (!branchId) return "HQ";
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Bilinmiyor";
  };

  const getEmployeeTypeName = (typeId: number | null | undefined) => {
    if (!typeId) return null;
    const et = employeeTypes.find((t: any) => t.id === typeId);
    return et?.name || null;
  };

  const getUserCategory = (userRole: string): CategoryFilter => {
    if (HQ_ROLES.includes(userRole)) return "hq";
    if (FACTORY_ROLES.includes(userRole)) return "fabrika";
    if (BRANCH_ROLES.includes(userRole)) return "sube";
    return "hq";
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.firstName?.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) ||
      u.lastName?.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) ||
      u.email?.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'));
    
    const matchesCategory = categoryFilter === "all" || getUserCategory(u.role) === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleResetPassword = (userItem: any) => {
    setSelectedUser(userItem);
    setResetPasswordDialog(true);
  };

  const handleCardClick = (userItem: any) => {
    setSelectedUser(userItem);
    setUserDetailDialog(true);
  };

  const getCategoryCounts = () => {
    const counts = { all: users.length, hq: 0, fabrika: 0, sube: 0 };
    users.forEach(u => {
      const cat = getUserCategory(u.role);
      counts[cat]++;
    });
    return counts;
  };

  const counts = getCategoryCounts();

  return (
    <div className="p-3 sm:p-4 pb-24 space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">Kullanıcı Yönetimi</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {filteredUsers.length} / {users.length} kullanıcı
          </p>
        </div>
      </div>

      {/* Kategori Filtreleri */}
      <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
        <TabsList className="w-full h-auto">
          <TabsTrigger value="all" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5" data-testid="tab-filter-all">
            Tümü ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="hq" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5" data-testid="tab-filter-hq">
            <Briefcase className="h-3 w-3 mr-0.5 sm:mr-1 flex-shrink-0" />
            <span className="hidden xs:inline">HQ</span> ({counts.hq})
          </TabsTrigger>
          <TabsTrigger value="fabrika" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5" data-testid="tab-filter-fabrika">
            <Factory className="h-3 w-3 mr-0.5 sm:mr-1 flex-shrink-0" />
            <span className="hidden xs:inline">Fab.</span> ({counts.fabrika})
          </TabsTrigger>
          <TabsTrigger value="sube" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5" data-testid="tab-filter-sube">
            <Store className="h-3 w-3 mr-0.5 sm:mr-1 flex-shrink-0" />
            <span className="hidden xs:inline">Şube</span> ({counts.sube})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="İsim veya e-posta ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          data-testid="input-search-users"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Yükleniyor...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Kullanıcı bulunamadı</p>
          ) : (
            filteredUsers.map((userItem) => (
              <Card 
                key={userItem.id} 
                className="hover-elevate cursor-pointer"
                onClick={() => handleCardClick(userItem)}
                data-testid={`user-card-${userItem.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userItem.profileImageUrl} />
                      <AvatarFallback>
                        {userItem.firstName?.[0]}{userItem.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {userItem.firstName} {userItem.lastName}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${ROLE_COLORS[userItem.role] || "bg-gray-500/10"}`}
                        >
                          {ROLE_LABELS[userItem.role] || userItem.role}
                        </Badge>
                        {getEmployeeTypeName(userItem.employeeTypeId) && (
                          <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400" data-testid={`badge-emptype-${userItem.id}`}>
                            {getEmployeeTypeName(userItem.employeeTypeId)}
                          </Badge>
                        )}
                        {userItem.isActive === false && (
                          <Badge variant="destructive" className="text-xs">Pasif</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{userItem.email || "E-posta yok"}</span>
                        </span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Building2 className="h-3 w-3" />
                          {getBranchName(userItem.branchId)}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" data-testid={`button-user-menu-${userItem.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResetPassword(userItem); }} data-testid={`menu-reset-password-${userItem.id}`}>
                          <Key className="h-4 w-4 mr-2" />
                          Şifre Sıfırla
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { 
                            e.stopPropagation();
                            toggleStatusMutation.mutate({ 
                              userId: userItem.id, 
                              isActive: userItem.isActive === false 
                            });
                          }}
                          data-testid={`menu-toggle-status-${userItem.id}`}
                        >
                          {userItem.isActive === false ? (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Aktif Et
                            </>
                          ) : (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Pasif Yap
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Kullanıcı Detay/İşlem Modal */}
      <Dialog open={userDetailDialog} onOpenChange={setUserDetailDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedUser?.profileImageUrl} />
                <AvatarFallback>
                  {selectedUser?.firstName?.[0]}{selectedUser?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedUser?.firstName} {selectedUser?.lastName}</span>
                <Badge 
                  variant="outline" 
                  className={`ml-2 text-xs ${ROLE_COLORS[selectedUser?.role] || ""}`}
                >
                  {ROLE_LABELS[selectedUser?.role] || selectedUser?.role}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {selectedUser?.email || "E-posta yok"}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {getBranchName(selectedUser?.branchId)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Durum: {selectedUser?.isActive === false ? (
                    <Badge variant="destructive" className="text-xs">Pasif</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">Aktif</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Personel Tipi:</span>
                  <Select
                    value={selectedUser?.employeeTypeId ? String(selectedUser.employeeTypeId) : "none"}
                    onValueChange={(val) => {
                      const newTypeId = val === "none" ? null : Number(val);
                      updateEmployeeTypeMutation.mutate({
                        userId: selectedUser?.id,
                        employeeTypeId: newTypeId,
                      });
                      setSelectedUser((prev: any) => prev ? { ...prev, employeeTypeId: newTypeId } : prev);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[160px]" data-testid="select-employee-type">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" data-testid="option-emptype-none">Yok</SelectItem>
                      {employeeTypes.map((et: any) => (
                        <SelectItem key={et.id} value={String(et.id)} data-testid={`option-emptype-${et.key}`}>
                          {et.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => handleResetPassword(selectedUser)}
              data-testid="button-modal-reset-password"
            >
              <Key className="h-4 w-4 mr-2" />
              Şifre Sıfırla
            </Button>
            <Button 
              variant={selectedUser?.isActive === false ? "default" : "destructive"}
              onClick={() => toggleStatusMutation.mutate({ 
                userId: selectedUser?.id, 
                isActive: selectedUser?.isActive === false 
              })}
              disabled={toggleStatusMutation.isPending}
              data-testid="button-modal-toggle-status"
            >
              {selectedUser?.isActive === false ? (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Aktif Et
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Pasif Yap
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Şifre Sıfırlama Onay Dialog */}
      <Dialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Sıfırlama</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> kullanıcısının şifresini sıfırlamak istediğinize emin misiniz? 
            Kullanıcıya yeni şifre için e-posta gönderilecektir.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialog(false)} data-testid="button-cancel-reset">
              İptal
            </Button>
            <Button 
              onClick={() => resetPasswordMutation.mutate(selectedUser?.id)}
              disabled={resetPasswordMutation.isPending}
              data-testid="button-confirm-reset"
            >
              {resetPasswordMutation.isPending ? "Gönderiliyor..." : "Şifre Sıfırla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
