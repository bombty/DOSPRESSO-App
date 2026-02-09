import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Factory, Store } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import logoUrl from "@assets/IMG_6637_1765138781125.png";

const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı zorunludur"),
  password: z.string().min(1, "Şifre zorunludur"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const getRedirectTarget = () => {
    const params = new URLSearchParams(window.location.search);
    const nextFromUrl = params.get("next");
    const nextFromStorage = sessionStorage.getItem("postLoginRedirect");
    sessionStorage.removeItem("postLoginRedirect");
    
    const target = nextFromUrl ? decodeURIComponent(nextFromUrl) : nextFromStorage;
    
    const safeTarget = (t: string | null): string => {
      if (!t) return "/";
      if (t.startsWith("//")) return "/";
      if (t.includes(":")) return "/";
      if (!t.startsWith("/")) return "/";
      if (!/^\/[A-Za-z0-9/_\-?=&%]*$/.test(t)) return "/";
      return t;
    };
    return safeTarget(target);
  };

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: async (data) => {
      // Şube girişi kontrolü
      if (data.authType === 'branch') {
        // Şube girişi - session storage'a şube bilgilerini kaydet
        sessionStorage.setItem('branchAuth', JSON.stringify(data.branch));
        
        toast({
          title: "Şube girişi başarılı",
          description: `${data.branch.name} şubesine hoş geldiniz!`,
        });
        
        // Şube dashboard'a yönlendir
        setTimeout(() => {
          navigate(data.redirectTo || '/sube/dashboard');
        }, 100);
        return;
      }
      
      // Normal kullanıcı girişi
      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
      }
      
      toast({
        title: "Giriş başarılı",
        description: "Hoş geldiniz!",
      });
      
      // HQ departman rolleri için özel dashboard yönlendirmesi (shared/schema.ts ile senkronize)
      const userRole = data.user?.role;
      const departmentRoutes: Record<string, string> = {
        'ceo': '/ceo-command-center',
        'cgo': '/hq-dashboard/cgo',
        'muhasebe_ik': '/hq-dashboard/ik',
        'satinalma': '/hq-dashboard/satinalma',
        'coach': '/hq-dashboard/coach',
        'marketing': '/hq-dashboard/marketing',
        'trainer': '/hq-dashboard/trainer',
        'kalite_kontrol': '/kalite-kontrol-dashboard',
        'fabrika_mudur': '/hq-dashboard/fabrika',
        'muhasebe': '/hq-dashboard/ik',
        'teknik': '/',
        'destek': '/',
        'fabrika': '/hq-dashboard/fabrika',
      };
      
      if (userRole && departmentRoutes[userRole]) {
        setTimeout(() => {
          navigate(departmentRoutes[userRole]);
        }, 100);
        return;
      }
      
      // Get redirect target and navigate
      const target = getRedirectTarget();
      
      // Small delay to ensure cookie is set
      setTimeout(() => {
        navigate(target);
      }, 100);
    },
    onError: (error) => {
      setError(error.message || "Giriş başarısız");
      toast({
        title: "Giriş başarısız",
        description: error.message || "Kullanıcı adı veya şifre hatalı",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: LoginFormData) {
    setError("");
    loginMutation.mutate(data);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center gap-2 sm:gap-3">
          <img 
            src={logoUrl} 
            alt="DOSPRESSO Logo" 
            className="w-48"
            data-testid="img-logo"
          />
          <CardDescription className="text-center">
            Franchise Yönetim Sistemi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Adı</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Kullanıcı adınızı girin"
                        data-testid="input-username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Şifrenizi girin"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <div className="text-sm text-destructive" data-testid="text-login-error">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  "Giriş Yap"
                )}
              </Button>

              <div className="flex justify-between gap-2 text-sm flex-wrap">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => navigate("/register")}
                  data-testid="link-register"
                >
                  Yeni Kayıt
                </button>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => navigate("/forgot-password")}
                  data-testid="link-forgot-password"
                >
                  Şifremi Unuttum
                </button>
              </div>
            </form>
          </Form>

          <Separator className="my-3" />

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Hızlı Giriş</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  form.setValue("username", "merkez");
                  form.setValue("password", "0000");
                  form.handleSubmit(onSubmit)();
                }}
                disabled={loginMutation.isPending}
                data-testid="button-quick-merkez"
              >
                <Building2 className="w-3.5 h-3.5" />
                Merkez
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  form.setValue("username", "fabrika");
                  form.setValue("password", "0000");
                  form.handleSubmit(onSubmit)();
                }}
                disabled={loginMutation.isPending}
                data-testid="button-quick-fabrika"
              >
                <Factory className="w-3.5 h-3.5" />
                Fabrika
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  form.setValue("username", "ışıklar");
                  form.setValue("password", "0000");
                  form.handleSubmit(onSubmit)();
                }}
                disabled={loginMutation.isPending}
                data-testid="button-quick-isiklar"
              >
                <Store className="w-3.5 h-3.5" />
                Işıklar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Tüm şubeler: şube adı ile giriş, şifre: 0000
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
