import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { compressImage } from "@/lib/image-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, PackageCheck, Clock, MapPin, User, Phone, Plus, Loader2, Camera, Calendar } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { LostFoundItem } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  bulunan: "Bulunan",
  teslim_edildi: "Teslim Edildi",
};

const STATUS_COLORS: Record<string, string> = {
  bulunan: "bg-warning/20 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  teslim_edildi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const newItemSchema = z.object({
  itemDescription: z.string().min(3, "Açıklama en az 3 karakter olmalı"),
  foundArea: z.string().min(2, "Bulunduğu yer girilmeli"),
  foundDate: z.string().min(1, "Tarih girilmeli"),
  foundTime: z.string().min(1, "Saat girilmeli"),
  notes: z.string().optional(),
});

const handoverSchema = z.object({
  ownerName: z.string().min(2, "İsim girilmeli"),
  ownerPhone: z.string().optional(),
  handoverNotes: z.string().optional(),
});

type LostFoundItemEnriched = LostFoundItem & {
  foundByName: string;
  branchName: string;
  handoveredByName?: string | null;
};

function ItemSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-3">
        <div className="h-4 bg-accent dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-accent dark:bg-gray-700 rounded w-1/2"></div>
      </CardContent>
    </Card>
  );
}

export default function KayipEsyaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isHandoverDialogOpen, setIsHandoverDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LostFoundItemEnriched | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("bulunan");

  const { data: items = [], isLoading } = useQuery<LostFoundItemEnriched[]>({
    queryKey: ["/api/lost-found"],
  });

  const foundItems = useMemo(() => items.filter(i => i.status === "bulunan"), [items]);
  const handedOverItems = useMemo(() => items.filter(i => i.status === "teslim_edildi"), [items]);

  const newItemForm = useForm<z.infer<typeof newItemSchema>>({
    resolver: zodResolver(newItemSchema),
    defaultValues: {
      itemDescription: "",
      foundArea: "",
      foundDate: new Date().toISOString().split('T')[0],
      foundTime: new Date().toTimeString().slice(0, 5),
      notes: "",
    },
  });

  const handoverForm = useForm<z.infer<typeof handoverSchema>>({
    resolver: zodResolver(handoverSchema),
    defaultValues: {
      ownerName: "",
      ownerPhone: "",
      handoverNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newItemSchema>) => {
      return apiRequest("POST", "/api/lost-found", {
        ...data,
        photoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lost-found"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lost-found/count"] });
      toast({ title: "Kayıt oluşturuldu", description: "Bulunan eşya kaydedildi" });
      setIsNewDialogOpen(false);
      setPhotoUrl(null);
      newItemForm.reset();
    },
    onError: (err) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const handoverMutation = useMutation({
    mutationFn: async (data: z.infer<typeof handoverSchema>) => {
      if (!selectedItem) return;
      return apiRequest("PATCH", `/api/lost-found/${selectedItem.id}/handover`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lost-found"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lost-found/count"] });
      toast({ title: "Teslim edildi", description: "Eşya sahibine teslim edildi" });
      setIsHandoverDialogOpen(false);
      setSelectedItem(null);
      handoverForm.reset();
    },
    onError: (err) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const openHandoverDialog = (item: LostFoundItemEnriched) => {
    setSelectedItem(item);
    setIsHandoverDialogOpen(true);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy HH:mm", { locale: tr });
    } catch {
      return "-";
    }
  };

  const stats = useMemo(() => ({
    found: foundItems.length,
    handedOver: handedOverItems.length,
    total: items.length,
  }), [foundItems, handedOverItems, items]);

  if (!user) return null;

  return (
    <div className="p-3 sm:p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold" data-testid="text-page-title">
            Kayıp & Bulunan Eşyalar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Şube bulunan eşyaları yönetin
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsNewDialogOpen(true)}
          className="gap-1"
          data-testid="button-new-item"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Yeni Kayıt</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-warning/20 dark:bg-yellow-900">
                <Briefcase className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bulunan</p>
                <p className="text-lg font-semibold" data-testid="text-stat-found">{stats.found}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900">
                <PackageCheck className="h-4 w-4 text-success dark:text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Teslim Edildi</p>
                <p className="text-lg font-semibold" data-testid="text-stat-handover">{stats.handedOver}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate hidden md:block">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam</p>
                <p className="text-lg font-semibold" data-testid="text-stat-total">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="bulunan" className="text-xs sm:text-sm" data-testid="tab-found">
            Bulunanlar ({stats.found})
          </TabsTrigger>
          <TabsTrigger value="teslim" className="text-xs sm:text-sm" data-testid="tab-handover">
            Teslim Edilenler ({stats.handedOver})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulunan" className="mt-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => <ItemSkeleton key={i} />)}
            </div>
          ) : foundItems.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Bekleyen bulunan eşya yok</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {foundItems.map((item) => (
                <Card key={item.id} className="hover-elevate" data-testid={`card-item-${item.id}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" data-testid={`text-description-${item.id}`}>
                          {item.itemDescription}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{item.foundArea}</span>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[item.status]} data-testid={`badge-status-${item.id}`}>
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </div>

                    {item.photoUrl && (
                      <img
                        src={item.photoUrl}
                        alt="Eşya fotoğrafı"
                        className="w-full h-24 object-cover rounded-md cursor-pointer hover-elevate"
                        onClick={() => setSelectedPhotoUrl(item.photoUrl)}
                        data-testid={`img-photo-${item.id}`}
                      />
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{item.foundByName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{item.foundDate} {item.foundTime}</span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
                        {item.notes}
                      </p>
                    )}

                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => openHandoverDialog(item)}
                      data-testid={`button-handover-${item.id}`}
                    >
                      <PackageCheck className="h-4 w-4 mr-1" />
                      Teslim Et
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="teslim" className="mt-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => <ItemSkeleton key={i} />)}
            </div>
          ) : handedOverItems.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <PackageCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz teslim edilen eşya yok</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {handedOverItems.map((item) => (
                <Card key={item.id} className="hover-elevate opacity-80" data-testid={`card-item-${item.id}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.itemDescription}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{item.foundArea}</span>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[item.status]}>
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </div>

                    {item.photoUrl && (
                      <img
                        src={item.photoUrl}
                        alt="Eşya fotoğrafı"
                        className="w-full h-20 object-cover rounded-md opacity-70 cursor-pointer hover-elevate"
                        onClick={() => setSelectedPhotoUrl(item.photoUrl)}
                        data-testid={`img-photo-handover-${item.id}`}
                      />
                    )}

                    <div className="p-2 bg-success/10 dark:bg-success/5 rounded-md text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium">Teslim Alan: {item.ownerName}</span>
                      </div>
                      {item.ownerPhone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{item.ownerPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Teslim: {formatDate(item.handoverDate)}</span>
                      </div>
                      {item.handoveredByName && (
                        <p className="text-muted-foreground">Teslim Eden: {item.handoveredByName}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Bulunan Eşya</DialogTitle>
          </DialogHeader>
          <Form {...newItemForm}>
            <form onSubmit={newItemForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={newItemForm.control}
                name="itemDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eşya Açıklaması *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: Siyah cüzdan, mavi şemsiye..."
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newItemForm.control}
                name="foundArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bulunduğu Yer *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: Bar önü, masa 5, tuvalet girişi..."
                        {...field}
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={newItemForm.control}
                  name="foundDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarih *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={newItemForm.control}
                  name="foundTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saat *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={newItemForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ek bilgiler..."
                        rows={2}
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Fotoğraf (Opsiyonel)</FormLabel>
                {photoUrl ? (
                  <div className="relative">
                    <img
                      src={photoUrl}
                      alt="Yüklenen fotoğraf"
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => setPhotoUrl(null)}
                    >
                      Kaldır
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsCompressing(true);
                          try {
                            const compressed = await compressImage(file);
                            setPhotoUrl(compressed);
                            toast({ title: "Fotoğraf sıkıştırıldı", description: "Boyut optimize edildi" });
                          } catch {
                            const reader = new FileReader();
                            reader.onloadend = () => setPhotoUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          } finally {
                            setIsCompressing(false);
                          }
                        }
                      }}
                      className="hidden"
                      id="photo-upload"
                      data-testid="input-photo"
                    />
                    <label htmlFor="photo-upload">
                      <Button type="button" variant="outline" size="sm" asChild disabled={isCompressing}>
                        <span className="cursor-pointer flex items-center gap-1">
                          {isCompressing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                          {isCompressing ? "Sıkıştırılıyor..." : "Fotoğraf Ekle"}
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewDialogOpen(false)}
                  data-testid="button-cancel-new"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-new"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    "Kaydet"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isHandoverDialogOpen} onOpenChange={setIsHandoverDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eşyayı Teslim Et</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="p-3 bg-muted rounded-md text-sm mb-4">
              <p className="font-medium">{selectedItem.itemDescription}</p>
              <p className="text-xs text-muted-foreground">{selectedItem.foundArea}</p>
            </div>
          )}
          <Form {...handoverForm}>
            <form onSubmit={handoverForm.handleSubmit((data) => handoverMutation.mutate(data))} className="space-y-4">
              <FormField
                control={handoverForm.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teslim Alan Kişi *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ad Soyad"
                        {...field}
                        data-testid="input-owner-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={handoverForm.control}
                name="ownerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="05XX XXX XX XX"
                        {...field}
                        data-testid="input-owner-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={handoverForm.control}
                name="handoverNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teslim Notları (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Kimlik gösterildi, vb..."
                        rows={2}
                        {...field}
                        data-testid="input-handover-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsHandoverDialogOpen(false);
                    setSelectedItem(null);
                  }}
                  data-testid="button-cancel-handover"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={handoverMutation.isPending}
                  data-testid="button-submit-handover"
                >
                  {handoverMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <PackageCheck className="h-4 w-4 mr-1" />
                      Teslim Et
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPhotoUrl} onOpenChange={(open) => !open && setSelectedPhotoUrl(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-photo-view">
          <DialogHeader>
            <DialogTitle>Fotoğraf</DialogTitle>
          </DialogHeader>
          {selectedPhotoUrl && (
            <img
              src={selectedPhotoUrl}
              alt="Fotoğraf"
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
