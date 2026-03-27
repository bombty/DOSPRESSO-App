// ─── ROLE HOME ROUTES ────────────────────────────────────
// All non-kiosk roles go to HomeScreen ("/")
// Kiosk roles go directly to their kiosk page
// 
// CONTROL CARD TARGETS (where "Control" module card navigates):
//   ceo, cgo, admin → /hq-ozet (MissionControlHQ)
//   coach, trainer → /kocluk-paneli (MissionControlCoach)
//   supervisor, supervisor_buddy, mudur → /sube-ozet (MissionControlSupervisor)
//   muhasebe, muhasebe_ik → /merkez-dashboard (MissionControlMuhasebe)
//   yatirimci_branch, yatirimci_hq → /franchise-ozet (MissionControlYatirimci)
//   fabrika_mudur, uretim_sefi → /fabrika/dashboard (MissionControlFabrika)
//   barista, stajyer, bar_buddy → /benim-gunum (MissionControlStajyer)
//   satinalma, marketing, teknik, destek, gida_muhendisi, kalite_kontrol → /hq-dashboard (MissionControlDynamic)
// ──────────────────────────────────────────────────────────

export const ROLE_HOME_ROUTES: Record<string, string> = {
  // Kiosk roles → direct to kiosk (skip HomeScreen)
  fabrika_operator: '/fabrika/kiosk',
  fabrika_sorumlu: '/fabrika/kiosk',
  fabrika_personel: '/fabrika/kiosk',
  sube_kiosk: '/sube/kiosk',

  // All other roles → HomeScreen
  stajyer: '/',
  bar_buddy: '/',
  barista: '/',
  supervisor: '/',
  supervisor_buddy: '/',
  mudur: '/',
  fabrika_mudur: '/',
  fabrika: '/',
  uretim_sefi: '/',
  ceo: '/',
  cgo: '/',
  admin: '/',
  coach: '/',
  trainer: '/',
  gida_muhendisi: '/',
  muhasebe: '/',
  muhasebe_ik: '/',
  satinalma: '/',
  marketing: '/',
  teknik: '/',
  destek: '/',
  kalite_kontrol: '/',
  yatirimci_hq: '/',
  yatirimci_branch: '/',
  ik: '/',
  pazarlama: '/',
  ekipman_teknik: '/',
};

/** Map role to its Control/MC dashboard page */
export const ROLE_CONTROL_PATH: Record<string, string> = {
  ceo: '/hq-ozet',
  cgo: '/hq-ozet',
  admin: '/hq-ozet',
  coach: '/kocluk-paneli',
  trainer: '/hq-dashboard/trainer',
  supervisor: '/sube-ozet',
  supervisor_buddy: '/sube-ozet',
  mudur: '/sube-ozet',
  muhasebe: '/merkez-dashboard',
  muhasebe_ik: '/merkez-dashboard',
  yatirimci_branch: '/franchise-ozet',
  yatirimci_hq: '/franchise-ozet',
  fabrika_mudur: '/fabrika/dashboard',
  uretim_sefi: '/fabrika/dashboard',
  barista: '/benim-gunum',
  bar_buddy: '/benim-gunum',
  stajyer: '/benim-gunum',
  satinalma: '/hq-dashboard/satinalma',
  marketing: '/hq-dashboard/marketing',
  gida_muhendisi: '/hq-dashboard',
  kalite_kontrol: '/kalite-kontrol-dashboard',
  teknik: '/hq-dashboard/teknik',
  destek: '/hq-dashboard/destek',
};

export function getRoleHomePath(role: string | undefined, branchId?: number | null): string {
  if (!role) return '/';
  if (role === 'sube_kiosk' && branchId) return `/sube/kiosk/${branchId}`;
  return ROLE_HOME_ROUTES[role] || '/';
}
