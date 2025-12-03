import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            DOSPRESSO
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Franchise Yönetim Platformu
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
          <p className="text-center text-muted-foreground">
            Şube operasyonlarınızı yönetin, görevleri takip edin, ekipman arızalarını raporlayın ve performansı analiz edin.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            <Link href="/login" className="block w-full">
              <Button className="w-full" size="lg" data-testid="button-login">
                Giriş Yap
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
