import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, CalendarDays, Edit, Trash } from "lucide-react";
import type { EmployeeAvailability } from "@shared/schema";
import { insertEmployeeAvailabilitySchema } from "@shared/schema";

const reasonMap: Record<string, string> = {
  unavailable: "Müsait Değil",
  vacation: "İzin",
  sick: "Hastalık",
  personal: "Kişisel",
  other: "Diğer",
};

export default function PersonelMusaitlik() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<EmployeeAvailability | null>(null);

  const { data: availabilities, isLoading } = useQuery<EmployeeAvailability[]>({
    queryKey: ["/api/employee-availability"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/employee-availability", data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Müsaitlik durumu eklendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-availability"] });
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Müsaitlik durumu eklenemedi",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/employee-availability/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Müsaitlik durumu güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-availability"] });
      setIsEditOpen(false);
      setSelectedAvailability(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Müsaitlik durumu güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/employee-availability/${id}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Müsaitlik durumu silindi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-availability"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Müsaitlik durumu silinemedi",
        variant: "destructive",
      });
    },
  });

  const availabilityForm = useForm<{
    startDate: string;
    endDate: string;
    reason: "unavailable" | "vacation" | "sick" | "personal" | "other";
    notes: string;
    isAllDay: boolean;
    startTime?: string;
    endTime?: string;
  }>({
    resolver: zodResolver(insertEmployeeAvailabilitySchema.omit({ id: true, userId: true, status: true, createdAt: true, updatedAt: true })),
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "unavailable",
      notes: "",
      isAllDay: true,
      startTime: "",
      endTime: "",
    },
  });

  const isAllDay = availabilityForm.watch("isAllDay");

  const handleEdit = (availability: EmployeeAvailability) => {
    setSelectedAvailability(availability);
    availabilityForm.reset({
      startDate: availability.startDate,
      endDate: availability.endDate,
      reason: availability.reason as "unavailable" | "vacation" | "sick" | "personal" | "other",
      notes: availability.notes || "",
      isAllDay: availability.isAllDay,
      startTime: availability.startTime || "",
      endTime: availability.endTime || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Bu müsaitlik durumunu silmek istediğinizden emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmitCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const onSubmitEdit = (data: any) => {
    if (selectedAvailability) {
      updateMutation.mutate({ id: selectedAvailability.id, data });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Müsaitlik Takvimi</h1>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-availability">
              <Plus className="mr-2 h-4 w-4" />
              Müsaitlik Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Müsaitlik Durumu Ekle</DialogTitle>
              <DialogDescription>
                Müsait olmadığınız tarihleri işaretleyin
              </DialogDescription>
            </DialogHeader>
            <Form {...availabilityForm}>
              <form onSubmit={availabilityForm.handleSubmit(onSubmitCreate)} className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={availabilityForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlangıç Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={availabilityForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bitiş Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={availabilityForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sebep</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-reason">
                            <SelectValue placeholder="Sebep seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unavailable">Müsait Değil</SelectItem>
                          <SelectItem value="vacation">İzin</SelectItem>
                          <SelectItem value="sick">Hastalık</SelectItem>
                          <SelectItem value="personal">Kişisel</SelectItem>
                          <SelectItem value="other">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={availabilityForm.control}
                  name="isAllDay"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Tüm Gün</FormLabel>
                        <FormDescription>
                          Tüm gün müsait değilim
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-all-day"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!isAllDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={availabilityForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlangıç Saati</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-start-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={availabilityForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bitiş Saati</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-end-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={availabilityForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar (Opsiyonel)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ek açıklama" {...field} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {availabilities && availabilities.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Henüz müsaitlik durumu yok</CardTitle>
            <CardDescription>
              Müsait olmadığınız tarihleri ekleyerek yöneticinize bilgi verin
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availabilities?.map((availability) => (
          <Card key={availability.id} data-testid={`card-availability-${availability.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">{reasonMap[availability.reason]}</span>
                <Badge 
                  variant={availability.status === "active" ? "default" : "secondary"}
                  data-testid={`badge-status-${availability.id}`}
                >
                  {availability.status === "active" ? "Aktif" : "İptal"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Başlangıç:</span>
                  <span className="font-medium" data-testid={`text-start-${availability.id}`}>
                    {new Date(availability.startDate).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bitiş:</span>
                  <span className="font-medium" data-testid={`text-end-${availability.id}`}>
                    {new Date(availability.endDate).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                {!availability.isAllDay && availability.startTime && availability.endTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saat:</span>
                    <span className="font-medium" data-testid={`text-time-${availability.id}`}>
                      {availability.startTime} - {availability.endTime}
                    </span>
                  </div>
                )}
                {availability.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Not:</span>
                    <p className="mt-1" data-testid={`text-notes-${availability.id}`}>
                      {availability.notes}
                    </p>
                  </div>
                )}
              </div>

              {availability.status === "active" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(availability)}
                    data-testid={`button-edit-${availability.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(availability.id)}
                    data-testid={`button-delete-${availability.id}`}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müsaitlik Durumunu Düzenle</DialogTitle>
            <DialogDescription>
              Müsaitlik bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <Form {...availabilityForm}>
            <form onSubmit={availabilityForm.handleSubmit(onSubmitEdit)} className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={availabilityForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlangıç Tarihi</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={availabilityForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bitiş Tarihi</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={availabilityForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sebep</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-reason">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unavailable">Müsait Değil</SelectItem>
                        <SelectItem value="vacation">İzin</SelectItem>
                        <SelectItem value="sick">Hastalık</SelectItem>
                        <SelectItem value="personal">Kişisel</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={availabilityForm.control}
                name="isAllDay"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Tüm Gün</FormLabel>
                      <FormDescription>
                        Tüm gün müsait değilim
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-all-day"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={availabilityForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlangıç Saati</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-edit-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={availabilityForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bitiş Saati</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-edit-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={availabilityForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
