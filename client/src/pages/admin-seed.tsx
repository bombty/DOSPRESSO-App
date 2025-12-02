import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database } from "lucide-react";

export default function AdminSeedPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsSeeding(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/seed-equipment-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Seed işlemi başarısız');
      }

      setResult(data);
      toast({
        title: "✅ Başarılı",
        description: "Ekipman, eğitim ve personel verileri eklendi",
      });
    } catch (error: any) {
      toast({
        title: "❌ Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <h1 className="text-3xl font-bold">Veri Ekle (Seed)</h1>
        <p className="text-muted-foreground mt-1">
          Örnek ekipman, eğitim modülleri ve personel verilerini ekleyin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Örnek Veri Ekleme
          </CardTitle>
          <CardDescription>
            Bu işlem tüm şubeler için örnek ekipman, eğitim modülleri ve personel ekleyecektir.
            Her şubeye 1 supervisor, 2 barista ve 1 stajyer atanacak.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <Button
            onClick={handleSeed}
            disabled={isSeeding}
            size="lg"
            data-testid="button-seed-data"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Veriler Ekleniyor...
              </>
            ) : (
              'Örnek Verileri Ekle'
            )}
          </Button>

          {result && (
            <div className="p-4 rounded-lg bg-muted grid grid-cols-1 gap-2">
              <p className="font-semibold text-green-600">✅ İşlem Başarılı</p>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Ekipman:</strong> {result.data?.equipment?.created} eklendi,{' '}
                  {result.data?.equipment?.skipped} atlandı
                </p>
                <p>
                  <strong>Eğitim:</strong> {result.data?.training?.created} eklendi,{' '}
                  {result.data?.training?.skipped} atlandı
                </p>
                <p>
                  <strong>Personel:</strong> {result.data?.personnel?.created} eklendi,{' '}
                  {result.data?.personnel?.skipped} atlandı
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eklenecek Veriler</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div>
            <h3 className="font-semibold mb-2">📦 Ekipman</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Her şube için: La Marzocco Linea PB espresso makinesi</li>
              <li>Mahlkonig grinder</li>
              <li>Buzdolabı</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">📚 Eğitim Modülleri</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Espresso Hazırlama Temelleri</li>
              <li>Süt Köpürtme Teknikleri</li>
              <li>Latte Art Başlangıç</li>
              <li>Müşteri Hizmetleri</li>
              <li>Hijyen ve Temizlik</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">👥 Personel</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Her şube için 1 supervisor</li>
              <li>Her şube için 2 barista</li>
              <li>Her şube için 1 stajyer</li>
              <li>Toplam 76 çalışan (19 şube × 4 kişi)</li>
              <li>Kullanıcı adı formatı: barista1@ankara</li>
              <li>Varsayılan şifre: 0000</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
