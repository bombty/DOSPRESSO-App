import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Eski BannerEditor → DuyuruStudioV2 yönlendirmesi
 * 1713 satırlık eski bileşen kaldırıldı.
 * /banner-editor URL'si /duyuru-studio'ya yönlendirir.
 */
export default function BannerEditor() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/duyuru-studio");
  }, [navigate]);
  return null;
}
