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
import { Loader2 } from "lucide-react";
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
      if (data.authType === 'branch') {
        sessionStorage.setItem('branchAuth', JSON.stringify(data.branch));
        toast({
          title: "Sube girisi basarili",
          description: `${data.branch.name} subesine hos geldiniz!`,
        });
        setTimeout(() => {
          navigate(data.redirectTo || '/sube/dashboard');
        }, 100);
        return;
      }

      await queryClient.cancelQueries();
      queryClient.clear();

      toast({
        title: "Giris basarili",
        description: "Hos geldiniz!",
      });

      const userRole = data.user?.role;
      const departmentRoutes: Record<string, string> = {
        'admin': '/',
        'ceo': '/ceo-command-center',
        'cgo': '/cgo-command-center',
        'muhasebe_ik': '/merkez-dashboard',
        'satinalma': '/hq-dashboard/satinalma',
        'coach': '/hq-dashboard/coach',
        'marketing': '/hq-dashboard/marketing',
        'trainer': '/hq-dashboard/trainer',
        'kalite_kontrol': '/kalite-kontrol-dashboard',
        'fabrika_mudur': '/fabrika/dashboard',
        'muhasebe': '/merkez-dashboard',
        'teknik': '/',
        'destek': '/',
        'fabrika': '/fabrika/dashboard',
      };

      const getTarget = () => {
        if (userRole && departmentRoutes[userRole]) return departmentRoutes[userRole];
        if (userRole === 'supervisor' || userRole === 'supervisor_buddy') return '/';
        if (userRole === 'mudur' && data.user?.branchId) return `/sube/${data.user.branchId}/dashboard`;
        const branchRoles = ['stajyer', 'bar_buddy', 'barista', 'yatirimci_branch'];
        if (userRole && branchRoles.includes(userRole) && data.user?.branchId) return '/sube/employee-dashboard';
        return getRedirectTarget();
      };

      const target = getTarget();

      const waitForSession = async (retries = 5): Promise<boolean> => {
        for (let i = 0; i < retries; i++) {
          try {
            const res = await fetch("/api/auth/user", { credentials: "include" });
            if (res.ok) {
              const userData = await res.json();
              queryClient.setQueryData(["/api/auth/user"], userData);
              return true;
            }
          } catch {}
          await new Promise(r => setTimeout(r, 200 * (i + 1)));
        }
        return false;
      };

      const sessionReady = await waitForSession();
      if (!sessionReady && data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
      }
      navigate(target);
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

        </CardContent>
      </Card>
    </div>
  );
}
