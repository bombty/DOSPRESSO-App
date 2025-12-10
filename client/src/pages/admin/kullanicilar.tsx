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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Shield
} from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  muhasebe: "Muhasebe",
  teknik: "Teknik",
  destek: "Destek",
  coach: "Coach",
  satinalma: "Satın Alma",
  yatirimci_hq: "Yatırımcı HQ",
  fabrika: "Fabrika",
  supervisor: "Supervisor",
  supervisor_buddy: "Supervisor Buddy",
  barista: "Barista",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/10 text-red-600",
  muhasebe: "bg-blue-500/10 text-blue-600",
  teknik: "bg-orange-500/10 text-orange-600",
  supervisor: "bg-green-500/10 text-green-600",
  barista: "bg-purple-500/10 text-purple-600",
};

export default function AdminKullanicilar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
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

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest("POST", `/api/admin/users/${userId}/reset-password`, {}),
    onSuccess: () => {
      setResetPasswordDialog(false);
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
      toast({ title: "Kullanıcı durumu güncellendi" });
    },
  });

  const getBranchName = (branchId: number | null) => {
    if (!branchId) return "HQ";
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Bilinmiyor";
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleResetPassword = (userItem: any) => {
    setSelectedUser(userItem);
    setResetPasswordDialog(true);
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kullanıcı Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground">
            {users.length} kullanıcı
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="İsim veya e-posta ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-users"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40" data-testid="select-role-filter">
            <Shield className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Roller</SelectItem>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Yükleniyor...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Kullanıcı bulunamadı</p>
          ) : (
            filteredUsers.map((userItem) => (
              <Card key={userItem.id} data-testid={`user-card-${userItem.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userItem.profileImageUrl} />
                      <AvatarFallback>
                        {userItem.firstName?.[0]}{userItem.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {userItem.firstName} {userItem.lastName}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${ROLE_COLORS[userItem.role] || "bg-gray-500/10"}`}
                        >
                          {ROLE_LABELS[userItem.role] || userItem.role}
                        </Badge>
                        {userItem.isActive === false && (
                          <Badge variant="destructive" className="text-xs">Pasif</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {userItem.email || "E-posta yok"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {getBranchName(userItem.branchId)}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleResetPassword(userItem)}>
                          <Key className="h-4 w-4 mr-2" />
                          Şifre Sıfırla
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => toggleStatusMutation.mutate({ 
                            userId: userItem.id, 
                            isActive: userItem.isActive === false 
                          })}
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
            <Button variant="outline" onClick={() => setResetPasswordDialog(false)}>
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
