import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, User, Briefcase, GraduationCap, Heart, UserMinus, Trash2, Camera, Wallet } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as UserType, Branch } from "@shared/schema";
import { isHQRole } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const employeeFormSchema = z.object({
  profileImageUrl: z.string().optional(),
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
  email: z.string().email("Geçerli e-posta giriniz").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  tckn: z.string().length(11, "TCKN 11 haneli olmalı").optional().or(z.literal("")),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  numChildren: z.coerce.number().min(0).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  homePhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  role: z.string().min(1, "Rol gerekli"),
  branchId: z.coerce.number().optional().nullable(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  probationEndDate: z.string().optional(),
  employmentType: z.string().optional(),
  weeklyHours: z.coerce.number().min(0).max(60).optional(),
  contractType: z.string().optional(),
  skillScore: z.coerce.number().min(0).max(100).optional(),
  educationLevel: z.string().optional(),
  educationStatus: z.string().optional(),
  educationInstitution: z.string().optional(),
  militaryStatus: z.string().optional(),
  disabilityLevel: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
  leaveStartDate: z.string().optional(),
  leaveReason: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function PersonelDuzenle() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: employee, isLoading: employeeLoading } = useQuery<UserType>({
    queryKey: ["/api/personnel", id],
    queryFn: async () => {
      const response = await fetch(`/api/personnel/${id}`);
      if (!response.ok) throw new Error("Failed to fetch employee");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      profileImageUrl: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      tckn: "",
      birthDate: "",
      gender: "",
      maritalStatus: "",
      numChildren: 0,
      address: "",
      city: "",
      homePhone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      role: "barista",
      branchId: null,
      department: "",
      hireDate: "",
      probationEndDate: "",
      employmentType: "fulltime",
      weeklyHours: 45,
      contractType: "",
      skillScore: 50,
      educationLevel: "",
      educationStatus: "",
      educationInstitution: "",
      militaryStatus: "",
      disabilityLevel: "",
      isActive: true,
      notes: "",
      leaveStartDate: "",
      leaveReason: "",
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        profileImageUrl: employee.profileImageUrl || "",
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        email: employee.email || "",
        phoneNumber: employee.phoneNumber || "",
        tckn: (employee as any).tckn || "",
        birthDate: employee.birthDate ? employee.birthDate.split("T")[0] : "",
        gender: (employee as any).gender || "",
        maritalStatus: (employee as any).maritalStatus || "",
        numChildren: (employee as any).numChildren || 0,
        address: (employee as any).address || "",
        city: (employee as any).city || "",
        homePhone: (employee as any).homePhone || "",
        emergencyContactName: employee.emergencyContactName || "",
        emergencyContactPhone: employee.emergencyContactPhone || "",
        role: employee.role || "barista",
        branchId: employee.branchId || null,
        department: (employee as any).department || "",
        hireDate: employee.hireDate ? employee.hireDate.split("T")[0] : "",
        probationEndDate: employee.probationEndDate ? employee.probationEndDate.split("T")[0] : "",
        employmentType: (employee as any).employmentType || "fulltime",
        weeklyHours: (employee as any).weeklyHours || 45,
        contractType: (employee as any).contractType || "",
        skillScore: (employee as any).skillScore || 50,
        educationLevel: (employee as any).educationLevel || "",
        educationStatus: (employee as any).educationStatus || "",
        educationInstitution: (employee as any).educationInstitution || "",
        militaryStatus: (employee as any).militaryStatus || "",
        disabilityLevel: (employee as any).disabilityLevel || "",
        isActive: employee.isActive !== false,
        notes: employee.notes || "",
        leaveStartDate: (employee as any).leaveStartDate ? (employee as any).leaveStartDate.split("T")[0] : "",
        leaveReason: (employee as any).leaveReason || "",
      });
    }
  }, [employee, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      return apiRequest("PUT", `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personnel", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Personel güncellendi",
        description: "Bilgiler başarıyla kaydedildi",
      });
      navigate(`/personel-detay/${id}`);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Güncelleme başarısız",
        variant: "destructive",
      });
    },
  });

  const canManage = currentUser && (isHQRole(currentUser.role as any) || currentUser.role === "admin");

  if (!canManage) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Card className="p-8 text-center">
          <p className="text-lg font-medium">Yetkisiz Erişim</p>
          <p className="text-sm text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
          <Button className="mt-4" onClick={() => navigate("/ik")}>
            Geri Dön
          </Button>
        </Card>
      </div>
    );
  }

  if (employeeLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Card className="p-8 text-center">
          <p className="text-lg font-medium">Personel Bulunamadı</p>
          <Button className="mt-4" onClick={() => navigate("/ik")}>
            Geri Dön
          </Button>
        </Card>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    muhasebe: "Muhasebe",
    satinalma: "Satınalma",
    coach: "Coach",
    teknik: "Teknik",
    destek: "Destek",
    fabrika: "Fabrika",
    yatirimci_hq: "Yatırımcı (HQ)",
    supervisor: "Supervisor",
    supervisor_buddy: "Supervisor Buddy",
    barista: "Barista",
    bar_buddy: "Bar Buddy",
    stajyer: "Stajyer",
    yatirimci: "Yatırımcı",
  };

  const onSubmit = (data: EmployeeFormValues) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Link href={`/personel-detay/${id}`}>
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Personel Düzenle</h1>
          <p className="text-muted-foreground">
            {employee.firstName} {employee.lastName}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="identity" className="w-full">
            <TabsList className="flex flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="identity" className="text-xs px-2 py-1.5">
                <User className="h-3 w-3 mr-1" />
                Kimlik
              </TabsTrigger>
              <TabsTrigger value="employment" className="text-xs px-2 py-1.5">
                <Briefcase className="h-3 w-3 mr-1" />
                İstihdam
              </TabsTrigger>
              <TabsTrigger value="education" className="text-xs px-2 py-1.5">
                <GraduationCap className="h-3 w-3 mr-1" />
                Eğitim
              </TabsTrigger>
              <TabsTrigger value="personal" className="text-xs px-2 py-1.5">
                <Heart className="h-3 w-3 mr-1" />
                Kişisel
              </TabsTrigger>
              <TabsTrigger value="termination" className="text-xs px-2 py-1.5">
                <UserMinus className="h-3 w-3 mr-1" />
                Ayrılış
              </TabsTrigger>
              {(currentUser?.role === 'admin' || currentUser?.role === 'muhasebe') && (
                <TabsTrigger value="salary" className="text-xs px-2 py-1.5">
                  <Wallet className="h-3 w-3 mr-1" />
                  Maaş
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="identity" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profil Fotoğrafı</CardTitle>
                  <CardDescription>Personelin profil fotoğrafını yükleyin</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="profileImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                              <Avatar className="w-32 h-32 border-2 border-border">
                                {field.value ? (
                                  <AvatarImage src={field.value} alt="Profil" className="object-cover" />
                                ) : (
                                  <AvatarFallback className="text-2xl">
                                    {(employee?.firstName?.[0] || "") + (employee?.lastName?.[0] || "")}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              {field.value && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="destructive"
                                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                                  onClick={() => field.onChange("")}
                                  data-testid="button-remove-profile-photo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            <ObjectUploader
                              onGetUploadParameters={async () => {
                                const res = await fetch("/api/objects/upload", {
                                  method: "POST",
                                  credentials: "include",
                                  headers: { "Content-Type": "application/json" }
                                });
                                if (!res.ok) throw new Error("Yükleme URL'si alınamadı");
                                return res.json();
                              }}
                              onComplete={(result) => {
                                if (result.successful?.[0]?.uploadURL) {
                                  field.onChange(result.successful[0].uploadURL);
                                }
                              }}
                              maxFileSize={3 * 1024 * 1024}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Fotoğraf Yükle
                            </ObjectUploader>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kimlik Bilgileri</CardTitle>
                  <CardDescription>Personelin temel kimlik bilgileri</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Soyad *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tckn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TCKN</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={11} data-testid="input-tckn" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doğum Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-birthDate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cinsiyet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-gender">
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Erkek">Erkek</SelectItem>
                            <SelectItem value="Kadın">Kadın</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-posta</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-email" />
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
                        <FormLabel>Cep Telefonu</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-phoneNumber" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="homePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ev Telefonu</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-homePhone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employment" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>İstihdam Bilgileri</CardTitle>
                  <CardDescription>Çalışma ve pozisyon bilgileri</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(roleLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şube</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))} 
                          value={field.value ? field.value.toString() : "none"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-branchId">
                              <SelectValue placeholder="Şube seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Şube Yok (HQ)</SelectItem>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departman</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-department">
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BAR">BAR</SelectItem>
                            <SelectItem value="Fabrika">Fabrika</SelectItem>
                            <SelectItem value="Yönetim">Yönetim</SelectItem>
                            <SelectItem value="Muhasebe">Muhasebe</SelectItem>
                            <SelectItem value="Satınalma">Satınalma</SelectItem>
                            <SelectItem value="Teknik">Teknik</SelectItem>
                            <SelectItem value="Eğitim">Eğitim</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İşe Giriş Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-hireDate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="probationEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deneme Süresi Bitiş</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-probationEndDate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Çalışma Tipi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "fulltime"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-employmentType">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fulltime">Tam Zamanlı</SelectItem>
                            <SelectItem value="parttime">Yarı Zamanlı</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weeklyHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Haftalık Saat</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} max={60} data-testid="input-weeklyHours" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contractType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sözleşme Tipi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-contractType">
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Süresiz">Süresiz</SelectItem>
                            <SelectItem value="Süreli">Süreli</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="skillScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yetenek Skoru (0-100)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} max={100} data-testid="input-skillScore" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Aktif Personel</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-isActive"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="education" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Eğitim & Askerlik</CardTitle>
                  <CardDescription>Eğitim ve askerlik durumu</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="educationLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eğitim Seviyesi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-educationLevel">
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="İlkokul">İlkokul</SelectItem>
                            <SelectItem value="Ortaokul">Ortaokul</SelectItem>
                            <SelectItem value="Lise">Lise</SelectItem>
                            <SelectItem value="Ön Lisans">Ön Lisans</SelectItem>
                            <SelectItem value="Lisans">Lisans</SelectItem>
                            <SelectItem value="Yüksek Lisans">Yüksek Lisans</SelectItem>
                            <SelectItem value="Doktora">Doktora</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="educationStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eğitim Durumu</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-educationStatus">
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Mezun">Mezun</SelectItem>
                            <SelectItem value="Öğrenci">Öğrenci</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="educationInstitution"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Okul/Üniversite</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-educationInstitution" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="militaryStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Askerlik Durumu</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-militaryStatus">
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Tamamlandı">Tamamlandı</SelectItem>
                            <SelectItem value="Tecilli">Tecilli</SelectItem>
                            <SelectItem value="Muaf">Muaf</SelectItem>
                            <SelectItem value="Tamamlanmadı">Tamamlanmadı</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="disabilityLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engel Durumu</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-disabilityLevel">
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Yok">Yok</SelectItem>
                            <SelectItem value="Var">Var</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Kişisel Bilgiler</CardTitle>
                  <CardDescription>Medeni durum ve adres bilgileri</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maritalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medeni Durum</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-maritalStatus">
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bekar">Bekar</SelectItem>
                            <SelectItem value="Evli">Evli</SelectItem>
                            <SelectItem value="Boşanmış">Boşanmış</SelectItem>
                            <SelectItem value="Dul">Dul</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numChildren"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Çocuk Sayısı</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-numChildren" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şehir</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Adres</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acil Durum Kişisi</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-emergencyContactName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acil Durum Telefonu</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-emergencyContactPhone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Notlar</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="termination" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ayrılış Bilgileri</CardTitle>
                  <CardDescription>İşten ayrılma durumunda doldurulur</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leaveStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ayrılış Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-leaveStartDate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leaveReason"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Ayrılış Nedeni</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-leaveReason" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {(currentUser?.role === 'admin' || currentUser?.role === 'muhasebe') && (
              <TabsContent value="salary" className="space-y-4 mt-4">
                <SalarySection userId={id || ""} />
              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-end gap-2">
            <Link href={`/personel-detay/${id}`}>
              <Button type="button" variant="outline" data-testid="button-cancel">
                İptal
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Salary Section Component
function SalarySection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: salary, isLoading } = useQuery({
    queryKey: ['/api/salary/employee', userId],
    queryFn: async () => {
      const res = await fetch(`/api/salary/employee/${userId}`);
      if (!res.ok) throw new Error("Maaş bilgileri alınamadı");
      return res.json();
    },
    enabled: !!userId,
  });

  const salaryForm = useForm({
    defaultValues: {
      baseSalary: 0,
      netSalary: 0,
      employmentType: "fulltime",
      weeklyHours: 45,
      hourlyRate: 0,
      paymentDay: 1,
      bankName: "",
      iban: "",
      taxRate: "0",
      insuranceRate: "0",
      effectiveFrom: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  useEffect(() => {
    if (salary) {
      salaryForm.reset({
        baseSalary: salary.baseSalary || 0,
        netSalary: salary.netSalary || 0,
        employmentType: salary.employmentType || "fulltime",
        weeklyHours: salary.weeklyHours || 45,
        hourlyRate: salary.hourlyRate || 0,
        paymentDay: salary.paymentDay || 1,
        bankName: salary.bankName || "",
        iban: salary.iban || "",
        taxRate: salary.taxRate || "0",
        insuranceRate: salary.insuranceRate || "0",
        effectiveFrom: salary.effectiveFrom || new Date().toISOString().split('T')[0],
        notes: salary.notes || "",
      });
    }
  }, [salary, salaryForm]);

  const saveSalaryMutation = useMutation({
    mutationFn: async (data: any) => {
      if (salary?.id) {
        return apiRequest(`/api/salary/employee/${salary.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/salary/employee", {
          method: "POST",
          body: JSON.stringify({ ...data, userId }),
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Maaş bilgileri kaydedildi" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/salary/employee', userId] });
    },
    onError: () => {
      toast({ title: "Maaş bilgileri kaydedilemedi", variant: "destructive" });
    },
  });

  const onSaveSalary = (data: any) => {
    saveSalaryMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const employmentType = salaryForm.watch("employmentType");

  return (
    <Form {...salaryForm}>
      <form onSubmit={salaryForm.handleSubmit(onSaveSalary)} className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Maaş Bilgileri</CardTitle>
              <CardDescription>Personelin maaş ve ödeme bilgileri</CardDescription>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(false)}
                    data-testid="button-cancel-salary"
                  >
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={saveSalaryMutation.isPending}
                    data-testid="button-save-salary"
                  >
                    {saveSalaryMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </>
              ) : (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-salary"
                >
                  Düzenle
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={salaryForm.control}
              name="employmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Çalışma Tipi</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!isEditing}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-salary-employmentType">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fulltime">Tam Zamanlı</SelectItem>
                      <SelectItem value="parttime">Yarı Zamanlı</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={salaryForm.control}
              name="weeklyHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Haftalık Çalışma Saati</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      min={0} 
                      max={60} 
                      disabled={!isEditing}
                      data-testid="input-salary-weeklyHours" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={salaryForm.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brüt Maaş (TL)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) * 100)}
                      value={Math.round((field.value || 0) / 100)}
                      disabled={!isEditing}
                      data-testid="input-salary-baseSalary" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={salaryForm.control}
              name="netSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Net Maaş (TL)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) * 100)}
                      value={Math.round((field.value || 0) / 100)}
                      disabled={!isEditing}
                      data-testid="input-salary-netSalary" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {employmentType === "parttime" && (
              <FormField
                control={salaryForm.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saatlik Ücret (TL)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) * 100)}
                        value={Math.round((field.value || 0) / 100)}
                        disabled={!isEditing}
                        data-testid="input-salary-hourlyRate" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={salaryForm.control}
              name="paymentDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ödeme Günü</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      min={1} 
                      max={31}
                      disabled={!isEditing}
                      data-testid="input-salary-paymentDay" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={salaryForm.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banka Adı</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={!isEditing}
                      data-testid="input-salary-bankName" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={salaryForm.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      maxLength={34}
                      disabled={!isEditing}
                      data-testid="input-salary-iban" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={salaryForm.control}
              name="effectiveFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geçerlilik Başlangıcı</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      disabled={!isEditing}
                      data-testid="input-salary-effectiveFrom" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={salaryForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      disabled={!isEditing}
                      data-testid="input-salary-notes" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
