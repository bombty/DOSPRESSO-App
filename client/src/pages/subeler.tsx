import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, insertBranchSchema, type Branch, type InsertBranch } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Phone, User, Plus, Pencil, Trash2, QrCode, Copy, Check } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmptyState } from "@/components/empty-state";

export default function SubelerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [copiedBranchId, setCopiedBranchId] = useState<number | null>(null);

  const { data: branches = [], isLoading, error } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: !!user,
  });

  const form = useForm<InsertBranch>({
    resolver: zodResolver(insertBranchSchema),
    defaultValues: {
      name: "",
      address: "",
      phoneNumber: "",
      managerName: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBranch) => {
      await apiRequest("POST", "/api/branches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Başarılı", description: "Şube eklendi" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Şube eklenemedi", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertBranch }) => {
      await apiRequest(`/api/branches/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Başarılı", description: "Şube güncellendi" });
      setEditingBranch(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Şube güncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/branches/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Başarılı", description: "Şube silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Şube silinemedi", variant: "destructive" });
    },
  });

  const handleEdit = (e: React.MouseEvent, branch: Branch) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingBranch(branch);
    form.reset({
      name: branch.name,
      address: branch.address || "",
      phoneNumber: branch.phoneNumber || "",
      managerName: branch.managerName || "",
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Bu şubeyi silmek istediğinizden emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (data: InsertBranch) => {
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const copyNFCLink = (branchId: number, branchName: string) => {
    const baseUrl = window.location.origin;
    const nfcLink = `${baseUrl}/vardiya-giris?method=nfc&branchId=${branchId}`;
    navigator.clipboard.writeText(nfcLink);
    setCopiedBranchId(branchId);
    toast({
      title: "Kopyalandı",
      description: `${branchName} NFC linki panoya kopyalandı`,
    });
    setTimeout(() => setCopiedBranchId(null), 2000);
  };

  // Filter branches based on user role
  // Branch users can only see their own branch, HQ users see all branches
  const filteredBranches = branches.filter((branch) => {
    if (!user?.role) return false;
    
    // HQ users see all branches
    if (isHQRole(user.role as any)) {
      return true;
    }
    
    // Branch users only see their own branch
    return user.branchId === branch.id;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
        <p className="text-lg text-destructive">Şubeler yüklenirken hata oluştu</p>
        <p className="text-sm text-muted-foreground">Lütfen sistem yöneticinize başvurun</p>
      </div>
    );
  }

  const isHQ = user?.role && isHQRole(user.role as any);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Şubeler</h1>
          <p className="text-muted-foreground mt-1">
            DOSPRESSO şubelerini görüntüleyin ve yönetin
          </p>
        </div>
        {isHQ && (
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-branch">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Şube Ekle
          </Button>
        )}
      </div>

      <Dialog open={isAddDialogOpen || !!editingBranch} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingBranch(null);
          form.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Şube Düzenle" : "Yeni Şube Ekle"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şube Adı</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Örn: Kadıköy Şubesi" data-testid="input-branch-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Şube adresi" data-testid="input-branch-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="0555 123 45 67" data-testid="input-branch-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="managerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager Adı</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Şube müdürü" data-testid="input-branch-manager" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingBranch(null);
                  form.reset();
                }}>
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending} 
                  data-testid="button-submit-branch"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {filteredBranches.map((branch) => (
          <Link key={branch.id} href={`/subeler/${branch.id}`}>
            <Card className="hover-elevate active-elevate-2 cursor-pointer h-full" data-testid={`card-branch-${branch.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                <CardTitle className="text-lg flex items-center gap-2 flex-1 min-w-0">
                  <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{branch.name}</span>
                </CardTitle>
                {isHQ && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={(e) => handleEdit(e, branch)}
                      data-testid={`button-edit-branch-${branch.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={(e) => handleDelete(e, branch.id)}
                      data-testid={`button-delete-branch-${branch.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:gap-4">
                <CardDescription>{branch.city}</CardDescription>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{branch.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Administrator: {branch.managerName}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyNFCLink(branch.id, branch.name);
                  }}
                  className="w-full mt-2"
                  data-testid={`button-copy-nfc-link-${branch.id}`}
                >
                  {copiedBranchId === branch.id ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      NFC Linki Kopyalandı
                    </>
                  ) : (
                    <>
                      <QrCode className="h-3 w-3 mr-1" />
                      NFC Linki Kopyala
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredBranches.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Şube bulunamadı"
          description="Henüz kayıtlı şube bulunmuyor."
          data-testid="empty-state-branches"
        />
      )}
    </div>
  );
}
