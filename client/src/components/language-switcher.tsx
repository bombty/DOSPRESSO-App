import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type SupportedLanguage,
} from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation("common");
  const { user } = useAuth();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (language: string) =>
      apiRequest("PATCH", "/api/me/settings", { language }),
    onError: () => {},
  });

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("dospresso_language", lang);
    if (user) {
      saveMutation.mutate(lang);
    }
    toast({
      title: t("languageChanged"),
      description: t("languageChangeDesc", {
        lang: LANGUAGE_LABELS[lang as SupportedLanguage],
      }),
    });
  };

  return (
    <div className="flex items-center gap-2" data-testid="language-switcher">
      {!compact && (
        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
      <Select value={i18n.language} onValueChange={handleChange}>
        <SelectTrigger
          className={compact ? "w-[100px]" : "w-[140px]"}
          data-testid="select-language"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem
              key={lang}
              value={lang}
              data-testid={`option-lang-${lang}`}
            >
              {LANGUAGE_LABELS[lang]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
