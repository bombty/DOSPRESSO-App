import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n";

export function useLanguageSync() {
  const { user } = useAuth();
  const lastUserId = useRef<string | null>(null);

  const shouldFetch = !!user && user.id !== lastUserId.current;

  const { data: settings } = useQuery<{ language: string }>({
    queryKey: ["/api/me/settings"],
    enabled: shouldFetch,
  });

  useEffect(() => {
    if (!user) {
      lastUserId.current = null;
      return;
    }
    if (!settings?.language || user.id === lastUserId.current) return;
    if (SUPPORTED_LANGUAGES.includes(settings.language as SupportedLanguage)) {
      i18n.changeLanguage(settings.language);
      localStorage.setItem("dospresso_language", settings.language);
      lastUserId.current = user.id;
    }
  }, [user, settings]);
}
