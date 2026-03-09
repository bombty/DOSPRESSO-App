import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { type Branch } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, RotateCcw, QrCode, Link as LinkIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

export default function SubeNFCDetay() {
  const { id: idStr } = useParams();
  const id = parseInt(idStr || "0");
  const { toast } = useToast();

  const { data: branch, isLoading, refetch, isError } = useQuery<Branch>({
    queryKey: [`/api/branches/${id}`],
  });

  if (isLoading) return <div className="p-4">Yükleniyor...</div>;
  if (!branch) return <div className="p-4">Şube bulunamadı</div>;

  // NFC URL format
  const nfcUrl = `https://app.dospresso.com/nfc?b=${branch.id}&t=${branch.qrCodeToken}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Kopyalandı", description: "URL panoya kopyalandı" });
  };

  const downloadQR = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `nfc-${branch.name}.png`;
      link.click();
      toast({ title: "İndirildi", description: "QR kod indirildi" });
    }
  };

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Şube Adı */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{branch.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {branch.address && <p><span className="text-secondary-foreground">Adres:</span> {branch.address}</p>}
          {branch.city && <p><span className="text-secondary-foreground">Şehir:</span> {branch.city}</p>}
        </CardContent>
      </Card>

      {/* NFC URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            NFC/RFID Linki
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted p-3 rounded-md break-all font-mono text-xs">
            {nfcUrl}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copyToClipboard(nfcUrl)}
            className="w-full"
            data-testid="button-copy-nfc-url"
          >
            <Copy className="w-4 h-4 mr-2" />
            Linki Kopyala
          </Button>
          <p className="text-xs text-secondary-foreground">
            Bu linki NTAG213/215 NFC etikete yazınız. Çalışanlar bu etikete telefon ile dokundurarak vardiya başlatabilir.
          </p>
        </CardContent>
      </Card>

      {/* QR Kod */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            QR Kod
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 flex flex-col items-center">
          <div className="bg-white p-4 rounded-md">
            <QRCodeSVG
              value={nfcUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadQR}
            className="w-full"
            data-testid="button-download-qr"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            QR Kodu İndir
          </Button>
          <p className="text-xs text-secondary-foreground">
            QR kodunu yazdırıp şube girişine asabilirsiniz. Çalışanlar telefon ile tarayarak vardiya başlatabilir.
          </p>
        </CardContent>
      </Card>

      {/* Bilgi */}
      <Card className="bg-info/5 border-info/20">
        <CardContent className="pt-4 text-xs space-y-2">
          <p><strong>Token:</strong> {branch.qrCodeToken?.substring(0, 20)}...</p>
          <p><strong>Giriş Yöntemi:</strong> {branch.checkInMethod === "both" ? "NFC + QR" : branch.checkInMethod?.toUpperCase()}</p>
          <p className="text-secondary-foreground">Her şubenin benzersiz bir token'ı vardır. Token kopyalanıp başka şubelere kullanılamaz.</p>
        </CardContent>
      </Card>
    </div>
  );
}
