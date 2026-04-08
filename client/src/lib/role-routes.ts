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
  sef: '/',
  recete_gm: '/',
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
  // HQ roles → Centrum
  ceo: '/ceo-command-center',
  cgo: '/cgo-teknik-komuta',
  admin: '/ceo-command-center',
  coach: '/coach-kontrol-merkezi',
  trainer: '/trainer-egitim-merkezi',
  muhasebe: '/muhasebe-centrum',
  muhasebe_ik: '/muhasebe-centrum',
  ik: '/muhasebe-centrum',
  satinalma: '/satinalma-centrum',
  gida_muhendisi: '/fabrika-centrum',
  kalite_kontrol: '/fabrika-centrum',

  // Fabrika + Depo
  fabrika_mudur: '/fabrika-centrum',
  uretim_sefi: '/fabrika-centrum',
  sef: '/fabrika-centrum',
  recete_gm: '/fabrika-centrum',
  fabrika_depo: '/depo-centrum',
  fabrika_pisman: '/fabrika-centrum',
  fabrika_kalite: '/fabrika-centrum',

  // Şube rolleri
  mudur: '/sube-centrum',
  supervisor: '/supervisor-centrum',
  supervisor_buddy: '/supbuddy-centrum',
  barista: '/personel-centrum',
  bar_buddy: '/personel-centrum',
  stajyer: '/personel-centrum',

  // Yatırımcı
  yatirimci_branch: '/yatirimci-centrum',
  yatirimci_hq: '/yatirimci-hq-centrum',

  // Diğer HQ
  marketing: '/marketing-centrum',
  teknik: '/cgo-teknik-komuta',
  destek: '/destek-centrum',
};

export function getRoleHomePath(role: string | undefined, branchId?: number | null): string {
  if (!role) return '/';
  if (role === 'sube_kiosk' && branchId) return `/sube/kiosk/${branchId}`;
  return ROLE_HOME_ROUTES[role] || '/';
}
