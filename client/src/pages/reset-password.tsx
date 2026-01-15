import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import logoUrl from "@assets/IMG_6637_1765138781125.png";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const params = useParams();
  const token = params.token;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const response = await apiRequest("POST", `/api/auth/reset-password/${token}`, {
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "Şifre güncellendi",
        description: "Şifreniz başarıyla değiştirildi. Giriş yapabilirsiniz.",
      });
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Şifre sıfırlanamadı",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ResetPasswordFormData) {
    resetPasswordMutation.mutate(data);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-3">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Geçersiz Link</CardTitle>
            <CardDescription className="text-center">
              Şifre sıfırlama bağlantısı geçersiz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate("/login")}
              data-testid="button-back-to-login"
            >
              Giriş Sayfasına Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-3">
        <Card className="w-full max-w-md">
          <CardHeader className="w-full space-y-2 sm:space-y-3">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" data-testid="icon-success" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Başarılı!</CardTitle>
            <CardDescription className="text-center">
              Şifreniz başarıyla değiştirildi. Giriş sayfasına yönlendiriliyorsunuz...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3">
      <Card className="w-full max-w-md">
        <CardHeader className="w-full space-y-2 sm:space-y-3">
          <div className="flex justify-center">
            <img 
              src={logoUrl} 
              alt="DOSPRESSO Logo" 
              className="w-48"
              data-testid="img-logo"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Yeni Şifre Belirle</CardTitle>
          <CardDescription className="text-center">
            Hesabınız için yeni bir şifre oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yeni Şifre</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Yeni şifrenizi girin"
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

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending}
                data-testid="button-submit"
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Şifreyi Kaydet"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
