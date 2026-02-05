import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/contexts/theme-context";
import { 
  Sun, 
  Moon, 
  Monitor,
  Type,
  Check
} from "lucide-react";

export default function GorunumAyarlari() {
  const { theme, fontSize, setTheme, setFontSize, effectiveTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: "Açık", icon: Sun, description: "Açık tema" },
    { value: "dark", label: "Koyu", icon: Moon, description: "Koyu tema" },
    { value: "system", label: "Sistem", icon: Monitor, description: "Cihaz ayarına göre" }
  ];

  const fontOptions = [
    { value: "small", label: "Küçük", size: "text-sm" },
    { value: "medium", label: "Orta", size: "text-base" },
    { value: "large", label: "Büyük", size: "text-lg" }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Type className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Görünüm Ayarları</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {effectiveTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Tema Seçimi
          </CardTitle>
          <CardDescription className="text-xs">
            Uygulama temasını seçin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                  data-testid={`theme-${option.value}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">{option.label}</span>
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="h-4 w-4" />
            Font Boyutu
          </CardTitle>
          <CardDescription className="text-xs">
            Metin boyutunu ayarlayın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {fontOptions.map((option) => {
              const isSelected = fontSize === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setFontSize(option.value as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                  data-testid={`font-${option.value}`}
                >
                  <span className={`font-medium ${option.size}`}>Aa</span>
                  <span className="text-xs font-medium">{option.label}</span>
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Önizleme:</p>
            <p className={fontOptions.find(f => f.value === fontSize)?.size}>
              Bu örnek metin seçilen font boyutunda görüntülenir.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Aktif tema:</span>
            <span className="font-medium capitalize">{effectiveTheme === "dark" ? "Koyu" : "Açık"}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Font boyutu:</span>
            <span className="font-medium">{fontOptions.find(f => f.value === fontSize)?.label}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
