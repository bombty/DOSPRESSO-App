import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState("");

  // Fetch current branding
  const { data: branding, isLoading } = useQuery<{ logoUrl: string | null; updatedAt: string | null }>({
    queryKey: ["/api/admin/branding"],
    staleTime: 5 * 60 * 1000,
  });

  // Update logo mutation
  const updateLogoMutation = useMutation({
    mutationFn: async (url: string) =>
      apiRequest("/api/admin/branding/logo", "POST", { logoUrl: url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branding"] });
      toast({ title: "Başarılı", description: "Logo güncellendi" });
      setLogoUrl("");
    },
    onError: () => {
      toast({ title: "Hata", description: "Logo güncellenemedi", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoUrl.trim()) {
      toast({ title: "Hata", description: "Logo URL gerekli", variant: "destructive" });
      return;
    }
    updateLogoMutation.mutate(logoUrl.trim());
  };

  if (isLoading) {
    return <div className="container py-6" data-testid="text-loading">Yükleniyor...</div>;
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6" data-testid="text-page-title">Ayarlar</h1>

      <Card>
        <CardHeader>
          <CardTitle>Şirket Logosu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {branding?.logoUrl && (
            <div className="flex flex-col gap-2">
              <Label>Mevcut Logo</Label>
              <img 
                src={branding.logoUrl} 
                alt="Şirket Logosu" 
                className="max-w-xs h-auto border rounded-md"
                data-testid="img-current-logo"
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="logoUrl">Logo URL (Public S3 URL)</Label>
              <Input
                id="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://bucket.s3.region.amazonaws.com/logo.png"
                data-testid="input-logo-url"
              />
              <p className="text-sm text-muted-foreground">
                Logo'yu S3'e yükleyip public URL'yi buraya yapıştırın
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={updateLogoMutation.isPending}
              data-testid="button-update-logo"
            >
              <Upload className="w-4 h-4 mr-2" />
              {updateLogoMutation.isPending ? "Kaydediliyor..." : "Logo Güncelle"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
