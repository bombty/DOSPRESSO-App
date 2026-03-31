/**
 * Centrum Görünürlük Matrisi
 * Her Centrum sayfasına kimin erişebileceğini tanımlar.
 * CEO tüm Centrumlara erişir. Diğer roller sadece kendi Centrumlarına.
 */

export const CENTRUM_ACCESS: Record<string, string[]> = {
  // CEO Centrum — sadece CEO
  "/ceo-command-center": ["ceo", "admin"],

  // CGO Centrum — CEO + CGO
  "/cgo-teknik-komuta": ["ceo", "cgo", "admin"],
  "/cgo-command-center": ["ceo", "cgo", "admin"],

  // Coach Centrum — CEO + Coach
  "/coach-kontrol-merkezi": ["ceo", "coach", "admin"],

  // Trainer Centrum — CEO + Trainer
  "/trainer-egitim-merkezi": ["ceo", "trainer", "admin"],

  // İK Centrum — CEO (özet) + İK + Muhasebe İK
  // CEO: sadece kişi sayısı + maliyet özeti, bireysel maaş YOK
  "/ik-centrum": ["ceo", "muhasebe_ik", "admin"],

  // Şube Sağlık — CEO + CGO + Coach + Trainer (okuma)
  "/sube-uyum-merkezi": ["ceo", "cgo", "coach", "trainer", "admin"],
  "/canli-takip":       ["ceo", "cgo", "coach", "trainer", "admin"],
};

/** Kullanıcının belirli bir Centrum sayfasına erişimi var mı? */
export function canAccessCentrum(role: string, path: string): boolean {
  // Admin her şeye erişir
  if (role === "admin") return true;
  
  const allowed = CENTRUM_ACCESS[path];
  if (!allowed) return true; // Tanımlanmamış sayfa = açık
  return allowed.includes(role);
}

/** Rol için varsayılan Centrum sayfası */
export function getDefaultCentrum(role: string): string {
  const centrumMap: Record<string, string> = {
    ceo:         "/ceo-command-center",
    cgo:         "/cgo-teknik-komuta",
    coach:       "/coach-kontrol-merkezi",
    trainer:     "/trainer-egitim-merkezi",
    muhasebe_ik: "/ik-centrum",
    admin:       "/dashboard",
  };
  return centrumMap[role] || "/dashboard";
}

/** İK bordro hassas veri — bu roller BİREYSEL maaş göremez */
export const PAYROLL_RESTRICTED_ROLES = [
  "ceo",    // CEO sadece toplam maliyet özeti görür
  "cgo",
  "coach",
  "trainer",
  "marketing",
  "satinalma",
];
