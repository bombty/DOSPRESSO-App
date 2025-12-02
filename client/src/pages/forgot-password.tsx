import { useState } from "react";
import { useLocation } from "wouter";
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
import { Loader2, ArrowLeft } from "lucide-react";
import logoUrl from "@assets/IMG_5044_1762851115459.png";

const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir email adresi girin"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "Email gönderildi",
        description: "Şifre sıfırlama bağlantısı email adresinize gönderildi.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ForgotPasswordFormData) {
    forgotPasswordMutation.mutate(data);
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex justify-center">
              <img 
                src={logoUrl} 
                alt="DOSPRESSO Logo" 
                className="w-48"
                data-testid="img-logo"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Email Gönderildi</CardTitle>
            <CardDescription className="text-center">
              Şifre sıfırlama bağlantısı email adresinize gönderildi. Lütfen email kutunuzu kontrol edin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate("/login")}
              data-testid="button-back-to-login"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Giriş Sayfasına Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex justify-center">
            <img 
              src={logoUrl} 
              alt="DOSPRESSO Logo" 
              className="w-48"
              data-testid="img-logo"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Şifremi Unuttum</CardTitle>
          <CardDescription className="text-center">
            Email adresinize şifre sıfırlama bağlantısı göndereceğiz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Adresi</FormLabel>
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

              <Button
                type="submit"
                className="w-full"
                disabled={forgotPasswordMutation.isPending}
                data-testid="button-submit"
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  "Şifre Sıfırlama Bağlantısı Gönder"
                )}
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => navigate("/login")}
                  data-testid="link-back-to-login"
                >
                  Giriş sayfasına dön
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
