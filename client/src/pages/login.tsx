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
import logoUrl from "@assets/IMG_5044_1762851115459.png";

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

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: async (data: any) => {
      // Manually set user in cache to avoid race condition
      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
      }
      
      toast({
        title: "Giriş başarılı",
        description: "Hoş geldiniz!",
      });
      
      // Small delay to ensure cookie is set
      setTimeout(() => {
        navigate("/");
      }, 100);
    },
    onError: (error: any) => {
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center gap-4">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

              <div className="flex justify-between text-sm">
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
