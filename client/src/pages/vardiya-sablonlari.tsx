import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Calendar, Edit, Trash, Copy } from "lucide-react";
import type { ShiftTemplate } from "@shared/schema";
import { insertShiftTemplateSchema } from "@shared/schema";

const dayOfWeekMap: Record<number, string> = {
  0: "Pazar",
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
};

const shiftTypeMap: Record<string, string> = {
  morning: "Sabah",
  evening: "Akşam",
  night: "Gece",
};

const createShiftsSchema = z.object({
  startDate: z.string().min(1, "Başlangıç tarihi gerekli"),
  endDate: z.string().min(1, "Bitiş tarihi gerekli"),
});

export default function VardiyaSablonlari() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);

  const { data: templates, isLoading } = useQuery<ShiftTemplate[]>({
    queryKey: ["/api/shift-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/shift-templates", data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Şablon oluşturuldu",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Şablon oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/shift-templates/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Şablon güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
      setIsEditOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Şablon güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/shift-templates/${id}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Şablon silindi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Şablon silinemedi",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("POST", `/api/shift-templates/${id}/create-shifts`, data);
    },
    onSuccess: (result: any) => {
      toast({
        title: "Başarılı",
        description: `${result.createdCount || 0} vardiya oluşturuldu`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setIsGenerateOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Vardiyalar oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const templateForm = useForm<{
    name: string;
    description: string;
    shiftType: "morning" | "evening" | "night";
    startTime: string;
    endTime: string;
    daysOfWeek?: number[];
  }>({
    resolver: zodResolver(insertShiftTemplateSchema.omit({ id: true, branchId: true, createdById: true, createdAt: true, updatedAt: true, isActive: true })),
    defaultValues: {
      name: "",
      description: "",
      shiftType: "morning",
      startTime: "",
      endTime: "",
      daysOfWeek: [],
    },
  });

  const generateForm = useForm({
    resolver: zodResolver(createShiftsSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
    },
  });

  const handleEdit = (template: ShiftTemplate) => {
    setSelectedTemplate(template);
    templateForm.reset({
      name: template.name,
      description: template.description || "",
      shiftType: template.shiftType as "morning" | "evening" | "night",
      startTime: template.startTime,
      endTime: template.endTime,
      daysOfWeek: template.daysOfWeek || [],
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Bu şablonu silmek istediğinizden emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleGenerate = (template: ShiftTemplate) => {
    setSelectedTemplate(template);
    generateForm.reset();
    setIsGenerateOpen(true);
  };

  const onSubmitCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const onSubmitEdit = (data: any) => {
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, data });
    }
  };

  const onSubmitGenerate = (data: any) => {
    if (selectedTemplate) {
      generateMutation.mutate({ id: selectedTemplate.id, data });
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
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Vardiya Şablonları</h1>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Şablon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Vardiya Şablonu</DialogTitle>
              <DialogDescription>
                Tekrarlayan vardiyalar için şablon oluşturun
              </DialogDescription>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(onSubmitCreate)} className="grid grid-cols-1 gap-4">
                <FormField
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlık</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: Sabah Vardiyası" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="shiftType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vardiya Tipi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-shift-type">
                            <SelectValue placeholder="Vardiya tipi seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">Sabah</SelectItem>
                          <SelectItem value="evening">Akşam</SelectItem>
                          <SelectItem value="night">Gece</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Açıklama (Opsiyonel)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Şablon açıklaması" {...field} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={templateForm.control}
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
                    control={templateForm.control}
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

                <FormField
                  control={templateForm.control}
                  name="daysOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Haftanın Günleri</FormLabel>
                      <FormDescription>
                        Bu şablon hangi günler için geçerli
                      </FormDescription>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(dayOfWeekMap).map(([value, label]) => (
                          <div key={value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${value}`}
                              checked={field.value?.includes(parseInt(value))}
                              onCheckedChange={(checked) => {
                                const numValue = parseInt(value);
                                const currentValue = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValue, numValue]);
                                } else {
                                  field.onChange(currentValue.filter((v: number) => v !== numValue));
                                }
                              }}
                              data-testid={`checkbox-day-${value}`}
                            />
                            <label
                              htmlFor={`day-${value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {label}
                            </label>
                          </div>
                        ))}
                      </div>
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
                    {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {templates && templates.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Henüz şablon yok</CardTitle>
            <CardDescription>
              Tekrarlayan vardiyalar için şablon oluşturarak iş yükünüzü azaltın
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map((template) => (
          <Card key={template.id} data-testid={`card-template-${template.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{template.name}</span>
                <Badge variant="outline" data-testid={`badge-type-${template.id}`}>
                  {shiftTypeMap[template.shiftType]}
                </Badge>
              </CardTitle>
              {template.description && (
                <CardDescription>{template.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saat:</span>
                  <span className="font-medium" data-testid={`text-time-${template.id}`}>
                    {template.startTime} - {template.endTime}
                  </span>
                </div>
                {template.daysOfWeek && template.daysOfWeek.length > 0 && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Günler:</span>
                    <div className="flex flex-wrap gap-1">
                      {template.daysOfWeek.map((day) => (
                        <Badge key={day} variant="secondary" className="text-xs" data-testid={`badge-day-${template.id}-${day}`}>
                          {dayOfWeekMap[day]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleGenerate(template)}
                  data-testid={`button-generate-${template.id}`}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Vardiya Oluştur
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(template)}
                  data-testid={`button-edit-${template.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                  data-testid={`button-delete-${template.id}`}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog - Similar to create */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Şablonu Düzenle</DialogTitle>
            <DialogDescription>
              Vardiya şablonunu güncelleyin
            </DialogDescription>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(onSubmitEdit)} className="grid grid-cols-1 gap-4">
              <FormField
                control={templateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="shiftType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vardiya Tipi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-shift-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="morning">Sabah</SelectItem>
                        <SelectItem value="evening">Akşam</SelectItem>
                        <SelectItem value="night">Gece</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
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
                  control={templateForm.control}
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

              <FormField
                control={templateForm.control}
                name="daysOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Haftanın Günleri</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(dayOfWeekMap).map(([value, label]) => (
                        <div key={value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-day-${value}`}
                            checked={field.value?.includes(parseInt(value))}
                            onCheckedChange={(checked) => {
                              const numValue = parseInt(value);
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, numValue]);
                              } else {
                                field.onChange(currentValue.filter((v: number) => v !== numValue));
                              }
                            }}
                            data-testid={`checkbox-edit-day-${value}`}
                          />
                          <label
                            htmlFor={`edit-day-${value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
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

      {/* Generate Shifts Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şablondan Vardiya Oluştur</DialogTitle>
            <DialogDescription>
              {selectedTemplate && `"${selectedTemplate.name}" şablonundan vardiyalar oluşturun`}
            </DialogDescription>
          </DialogHeader>
          <Form {...generateForm}>
            <form onSubmit={generateForm.handleSubmit(onSubmitGenerate)} className="grid grid-cols-1 gap-4">
              <FormField
                control={generateForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlangıç Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-generate-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={generateForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitiş Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-generate-end-date" />
                    </FormControl>
                    <FormDescription>
                      {selectedTemplate && selectedTemplate.daysOfWeek && selectedTemplate.daysOfWeek.length > 0
                        ? `Bu tarih aralığında, ${selectedTemplate.daysOfWeek.map(d => dayOfWeekMap[d]).join(', ')} günlerine otomatik vardiya oluşturulacak`
                        : "Tarih aralığında vardiyalar oluşturulacak"
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsGenerateOpen(false)}
                  data-testid="button-cancel-generate"
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={generateMutation.isPending}
                  data-testid="button-submit-generate"
                >
                  {generateMutation.isPending ? "Oluşturuluyor..." : "Vardiya Oluştur"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
