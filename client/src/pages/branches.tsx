import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBranchSchema, type Branch, type InsertBranch } from "@shared/schema";
import { Building2, Phone, MapPin, Pencil, Trash2, Plus } from "lucide-react";

export default function Branches() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
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
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Şube eklenemedi",
        variant: "destructive",
      });
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
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Şube güncellenemedi",
        variant: "destructive",
      });
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
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Şube silinemedi",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    form.reset({
      name: branch.name,
      address: branch.address || "",
      phoneNumber: branch.phoneNumber || "",
      managerName: branch.managerName || "",
    });
  };

  const handleSubmit = (data: InsertBranch) => {
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bu şubeyi silmek istediğinizden emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Şubeler</h1>
          <p className="text-muted-foreground mt-1">Şube bilgilerini yönetin</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-branch">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Şube Ekle
        </Button>
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
              <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      <FormLabel>Müdür Adı</FormLabel>
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {branches?.map((branch) => (
            <Card key={branch.id} data-testid={`card-branch-${branch.id}`} className="hover-elevate">
              <CardContent className="p-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium line-clamp-2">{branch.name}</h3>
                      {branch.managerName && <p className="text-xs text-muted-foreground">{branch.managerName}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleEdit(branch)}
                        data-testid={`button-edit-branch-${branch.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleDelete(branch.id)}
                        data-testid={`button-delete-branch-${branch.id}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {branch.phoneNumber && <p className="text-xs text-muted-foreground truncate">{branch.phoneNumber}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && branches && branches.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Henüz şube eklenmemiş.</p>
            <Button 
              className="mt-4" 
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-first-branch"
            >
              İlk Şubeyi Ekle
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
