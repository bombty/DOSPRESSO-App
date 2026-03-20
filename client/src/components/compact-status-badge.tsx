import { Badge } from "@/components/ui/badge";

const mobileLabels: Record<string, string> = {
  "Beklemede": "Bekl.",
  "Tamamlandı": "Tmm.",
  "Devam Ediyor": "Devam",
  "Kritik": "Krtk.",
  "Yüksek": "Yks.",
  "Orta": "Orta",
  "Düşük": "Düşk.",
  "Açık": "Açık",
  "Çözüldü": "Çözld.",
  "Atandı": "Atnd.",
  "İşleniyor": "İşlnyr.",
  "Kapatıldı": "Kptld.",
  "Onaylandı": "Onayl.",
  "Reddedildi": "Red.",
  "Geçti": "OK",
  "Başarısız": "Fail",
  "Uyarı": "Uyarı",
  "Mühendis Bekliyor": "Müh.B.",
  "Hazırlanıyor": "Haz.",
  "Sevk Edildi": "Sevk",
  "Teslim Edildi": "Teslm.",
  "Onay Bekliyor": "Onay B.",
  "Sipariş Verildi": "Sip.V.",
  "Kısmen Teslim": "K.Tslm.",
  "Taslak": "Taslk.",
  "İptal": "İptal",
  "SLA Aşıldı": "SLA!",
  "İşlemde": "İşlm.",
  "Kapalı": "Kplı.",
  "Bekliyor": "Bekl.",
};

interface CompactStatusBadgeProps {
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
  icon?: React.ReactNode;
  "data-testid"?: string;
}

export function CompactStatusBadge({
  label,
  variant = "secondary",
  className = "",
  icon,
  "data-testid": testId,
}: CompactStatusBadgeProps) {
  const mobileLabel = mobileLabels[label] || label;

  return (
    <>
      <Badge
        variant={variant}
        className={`md:hidden text-[10px] px-1.5 py-0.5 ${className}`}
        data-testid={testId ? `${testId}-mobile` : undefined}
      >
        {icon}
        {mobileLabel}
      </Badge>
      <Badge
        variant={variant}
        className={`hidden md:inline-flex ${className}`}
        data-testid={testId}
      >
        {icon}
        {label}
      </Badge>
    </>
  );
}
