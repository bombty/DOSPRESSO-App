export interface NavRailItem {
  key: string;
  icon: string;
  label: string;
  path: string;
  badge?: boolean;
}

export interface NavRailConfig {
  roles: string[];
  items: NavRailItem[];
}

export const NAV_RAIL_CONFIGS: NavRailConfig[] = [
  {
    roles: ['admin', 'ceo', 'cgo'],
    items: [
      { key: 'home', icon: 'Home', label: 'Ana Sayfa', path: '/' },
      { key: 'duyurular', icon: 'Megaphone', label: 'Duyurular', path: '/duyurular' },
      { key: 'crm', icon: 'MessageSquare', label: 'İletişim', path: '/hq-destek', badge: true },
      { key: 'akademi', icon: 'GraduationCap', label: 'Akademi', path: '/akademi' },
      { key: 'sube', icon: 'Building2', label: 'Şubeler', path: '/subeler' },
      { key: 'fabrika', icon: 'Factory', label: 'Fabrika', path: '/fabrika' },
      { key: 'raporlar', icon: 'BarChart2', label: 'Raporlar', path: '/raporlar' },
    ],
  },
  {
    roles: ['coach', 'trainer'],
    items: [
      { key: 'home', icon: 'Home', label: 'Ana Sayfa', path: '/' },
      { key: 'duyurular', icon: 'Megaphone', label: 'Duyurular', path: '/duyurular' },
      { key: 'akademi', icon: 'GraduationCap', label: 'Akademi', path: '/akademi', badge: true },
      { key: 'sube', icon: 'Building2', label: 'Şubeler', path: '/subeler' },
      { key: 'crm', icon: 'MessageSquare', label: 'İletişim', path: '/hq-destek' },
      { key: 'raporlar', icon: 'BarChart2', label: 'Raporlar', path: '/raporlar' },
    ],
  },
  {
    roles: ['muhasebe', 'muhasebe_ik', 'satinalma', 'marketing', 'pazarlama', 'teknik', 'destek', 'kalite_kontrol', 'gida_muhendisi', 'ekipman_teknik', 'ik', 'yatirimci_hq', 'fabrika'],
    items: [
      { key: 'home', icon: 'Home', label: 'Ana Sayfa', path: '/' },
      { key: 'crm', icon: 'MessageSquare', label: 'İletişim', path: '/hq-destek' },
      { key: 'raporlar', icon: 'BarChart2', label: 'Raporlar', path: '/raporlar' },
    ],
  },
  {
    roles: ['mudur', 'supervisor', 'supervisor_buddy'],
    items: [
      { key: 'home', icon: 'Home', label: 'Ana Sayfa', path: '/' },
      { key: 'gorev', icon: 'CheckSquare', label: 'Görevler', path: '/gorevler', badge: true },
      { key: 'akademi', icon: 'GraduationCap', label: 'Akademi', path: '/akademi' },
      { key: 'crm', icon: 'MessageSquare', label: 'İletişim', path: '/hq-destek' },
      { key: 'raporlar', icon: 'BarChart2', label: 'Raporlar', path: '/raporlar' },
    ],
  },
  {
    roles: ['barista', 'bar_buddy', 'stajyer', 'yatirimci_branch'],
    items: [
      { key: 'home', icon: 'Home', label: 'Ana Sayfa', path: '/' },
      { key: 'akademi', icon: 'GraduationCap', label: 'Akademi', path: '/akademi', badge: true },
      { key: 'gorev', icon: 'CheckSquare', label: 'Görevler', path: '/gorevler' },
    ],
  },
  {
    roles: ['fabrika_mudur'],
    items: [
      { key: 'home', icon: 'Home', label: 'Ana Sayfa', path: '/fabrika' },
      { key: 'gorev', icon: 'CheckSquare', label: 'Görevler', path: '/gorevler' },
      { key: 'crm', icon: 'MessageSquare', label: 'İletişim', path: '/hq-destek' },
    ],
  },
  {
    roles: ['fabrika_operator', 'fabrika_sorumlu', 'fabrika_personel'],
    items: [
      { key: 'home', icon: 'Home', label: 'Ana Sayfa', path: '/fabrika' },
      { key: 'gorev', icon: 'CheckSquare', label: 'Görevler', path: '/gorevler' },
    ],
  },
  {
    roles: ['sube_kiosk'],
    items: [],
  },
];

export function getNavRailItems(role: string | undefined): NavRailItem[] {
  if (!role) return [];
  const config = NAV_RAIL_CONFIGS.find(c => c.roles.includes(role));
  return config?.items ?? [];
}
