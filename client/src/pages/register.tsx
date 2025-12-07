import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logoUrl from "@assets/IMG_6637_1765138781125.png";

const registerSchema = z.object({
  email: z.string().email("Geçerli bir email adresi girin"),
  firstName: z.string().min(2, "İsim en az 2 karakter olmalı"),
  lastName: z.string().min(2, "Soyisim en az 2 karakter olmalı"),
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  confirmPassword: z.string(),
  role: z.string().min(1, "Rol seçimi zorunlu"),
  branchId: z.number().nullable().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
}).refine((data) => {
  // HQ roles don't need branch
  const hqRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
  if (!hqRoles.includes(data.role)) {
    return data.branchId !== null && data.branchId !== undefined;
  }
  return true;
}, {
  message: "Şube seçimi zorunlu",
  path: ["branchId"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const BRANCH_ROLES = [
  { value: 'stajyer', label: 'Stajyer' },
  { value: 'bar_buddy', label: 'Bar Buddy' },
  { value: 'barista', label: 'Barista' },
  { value: 'supervisor_buddy', label: 'Supervisor Buddy' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'yatirimci', label: 'Yatırımcı (Şube)' },
];

const HQ_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'muhasebe', label: 'Muhasebe' },
  { value: 'satinalma', label: 'Satın Alma' },
  { value: 'coach', label: 'Coach' },
  { value: 'teknik', label: 'Teknik Destek' },
  { value: 'destek', label: 'Destek' },
  { value: 'fabrika', label: 'Fabrika' },
  { value: 'yatirimci_hq', label: 'Yatırımcı (Merkez)' },
];

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isHQ, setIsHQ] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: "",
      branchId: null,
    },
  });

  const { data: branches } = useQuery<any[]>({
    queryKey: ['/api/public/branches'],
    enabled: !isHQ,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const payload = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        password: data.password,
        role: data.role,
        branchId: data.branchId,
      };
      const response = await apiRequest("POST", "/api/auth/register", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Kayıt başarılı",
        description: "Hesabınız onay için gönderildi. Email adresinizi kontrol edin.",
      });
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Kayıt başarısız",
        description: error.message || "Bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: RegisterFormData) {
    registerMutation.mutate(data);
  }

  const roleOptions = isHQ ? HQ_ROLES : BRANCH_ROLES;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3">
      <Card className="w-full max-w-2xl">
        <CardHeader className="w-full space-y-2 sm:space-y-3">
          <div className="flex justify-center">
            <img 
              src={logoUrl} 
              alt="DOSPRESSO Logo" 
              className="w-48"
              data-testid="img-logo"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Yeni Kayıt</CardTitle>
          <CardDescription className="text-center">
            DOSPRESSO Franchise Yönetim Sistemine kayıt olun
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
              <div className="w-full space-y-2 sm:space-y-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İsim</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="İsminizi girin"
                          data-testid="input-firstname"
                          {...field}
                        />
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
                      <FormLabel>Soyisim</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Soyisminizi girin"
                          data-testid="input-lastname"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@ornek.com"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Adı</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Kullanıcı adı seçin"
                        data-testid="input-username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="w-full space-y-2 sm:space-y-3">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şifre</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Şifre oluşturun"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şifre Tekrar</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Şifreyi tekrar girin"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-3 sm:gap-4">
                <FormLabel>Çalışma Konumu</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={!isHQ ? "default" : "outline"}
                    onClick={() => {
                      setIsHQ(false);
                      form.setValue('role', '');
                      form.setValue('branchId', null);
                    }}
                    data-testid="button-branch-staff"
                  >
                    Şube Personeli
                  </Button>
                  <Button
                    type="button"
                    variant={isHQ ? "default" : "outline"}
                    onClick={() => {
                      setIsHQ(true);
                      form.setValue('role', '');
                      form.setValue('branchId', null);
                    }}
                    data-testid="button-hq-staff"
                  >
                    Merkez Personeli
                  </Button>
                </div>
              </div>

              {!isHQ && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şube</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        value={field.value ? String(field.value) : undefined}
                        data-testid="select-branch"
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-trigger-branch">
                            <SelectValue placeholder="Şube seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches?.map((branch) => (
                            <SelectItem
                              key={branch.id}
                              value={String(branch.id)}
                              data-testid={`select-item-branch-${branch.id}`}
                            >
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol / Pozisyon</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      data-testid="select-role"
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger-role">
                          <SelectValue placeholder="Pozisyon seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem
                            key={role.value}
                            value={role.value}
                            data-testid={`select-item-role-${role.value}`}
                          >
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Kayıt Ol"
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Hesabınız var mı? </span>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => navigate("/login")}
                  data-testid="link-login"
                >
                  Giriş Yapın
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
