export const ROLE_HOME_ROUTES: Record<string, string> = {
  stajyer: '/benim-gunum',
  bar_buddy: '/benim-gunum',
  barista: '/benim-gunum',
  supervisor: '/sube-ozet',
  supervisor_buddy: '/sube-ozet',
  mudur: '/sube-ozet',
  fabrika_operator: '/fabrika/kiosk',
  fabrika_mudur: '/fabrika/dashboard',
  fabrika: '/fabrika/dashboard',
  uretim_sefi: '/fabrika/dashboard',
  fabrika_sorumlu: '/fabrika/kiosk',
  fabrika_personel: '/fabrika/kiosk',
  sube_kiosk: '/sube/kiosk',
  ceo: '/hq-ozet',
  cgo: '/hq-ozet',
  admin: '/hq-ozet',
  coach: '/kocluk-paneli',
  trainer: '/hq-dashboard/trainer',
  gida_muhendisi: '/hq-dashboard',
  muhasebe: '/merkez-dashboard',
  muhasebe_ik: '/merkez-dashboard',
  satinalma: '/hq-dashboard/satinalma',
  marketing: '/hq-dashboard/marketing',
  teknik: '/hq-dashboard/teknik',
  destek: '/hq-dashboard/destek',
  kalite_kontrol: '/kalite-kontrol-dashboard',
  yatirimci_hq: '/franchise-ozet',
  yatirimci_branch: '/franchise-ozet',
  ik: '/merkez-dashboard',
  pazarlama: '/hq-dashboard/marketing',
  ekipman_teknik: '/',
};

export function getRoleHomePath(role: string | undefined, branchId?: number | null): string {
  if (!role) return '/';
  if (role === 'sube_kiosk' && branchId) return `/sube/kiosk/${branchId}`;
  return ROLE_HOME_ROUTES[role] || '/';
}
