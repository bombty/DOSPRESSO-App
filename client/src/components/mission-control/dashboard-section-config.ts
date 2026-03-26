export interface DashboardSectionConfig {
  key: string;
  visibleTo: string[];
  defaultOpen: boolean;
}

export const DASHBOARD_SECTIONS: DashboardSectionConfig[] = [
  { key: 'ai_briefing', visibleTo: [], defaultOpen: true },
  { key: 'kpi_strip', visibleTo: [], defaultOpen: true },
  { key: 'date_filter', visibleTo: ['ceo', 'cgo', 'admin'], defaultOpen: true },
  { key: 'todays_tasks', visibleTo: [], defaultOpen: true },
  { key: 'alerts', visibleTo: ['ceo', 'cgo', 'admin'], defaultOpen: true },
  { key: 'branch_health', visibleTo: ['ceo', 'cgo', 'admin'], defaultOpen: true },
  { key: 'trend_chart', visibleTo: ['ceo', 'cgo', 'admin'], defaultOpen: false },
  { key: 'branch_grid', visibleTo: ['coach', 'trainer', 'satinalma', 'kalite_kontrol', 'gida_muhendisi', 'marketing', 'teknik', 'destek'], defaultOpen: true },
  { key: 'factory_qc', visibleTo: ['ceo', 'admin', 'kalite_kontrol', 'gida_muhendisi'], defaultOpen: false },
  { key: 'activity_timeline', visibleTo: ['ceo', 'cgo', 'admin'], defaultOpen: false },
  { key: 'ik_summary', visibleTo: ['ceo', 'admin', 'muhasebe_ik', 'muhasebe'], defaultOpen: false },
  { key: 'quick_actions', visibleTo: [], defaultOpen: true },
];

export function isSectionVisible(sectionKey: string, role: string): boolean {
  const section = DASHBOARD_SECTIONS.find(s => s.key === sectionKey);
  if (!section) return true;
  return section.visibleTo.length === 0 || section.visibleTo.includes(role);
}

export function getSectionDefaultOpen(sectionKey: string): boolean {
  const section = DASHBOARD_SECTIONS.find(s => s.key === sectionKey);
  return section?.defaultOpen ?? false;
}

import type { LucideIcon } from "lucide-react";

export interface QuickActionItem {
  label: string;
  path: string;
  iconName: string;
  color: string;
}

const DEFAULT_ACTIONS: QuickActionItem[] = [
  { label: "İletişim", path: "/hq-destek", iconName: "MessageSquare", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { label: "Şubeler", path: "/subeler", iconName: "Building2", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  { label: "Fabrika", path: "/fabrika/dashboard", iconName: "Factory", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
];

const ROLE_QUICK_ACTIONS: Record<string, QuickActionItem[]> = {
  ceo: [
    { label: "Şubeler", path: "/subeler", iconName: "Building2", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "CRM", path: "/crm", iconName: "MessageSquare", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
    { label: "Fabrika", path: "/fabrika/dashboard", iconName: "Factory", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  ],
  cgo: [
    { label: "Şubeler", path: "/subeler", iconName: "Building2", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "CRM", path: "/crm", iconName: "MessageSquare", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
    { label: "Akademi", path: "/akademi", iconName: "GraduationCap", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  ],
  admin: DEFAULT_ACTIONS,
  satinalma: [
    { label: "Stok", path: "/stok", iconName: "Package", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Tedarik", path: "/tedarikciler", iconName: "Truck", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Siparişler", path: "/siparisler", iconName: "ShoppingCart", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  ],
  marketing: [
    { label: "CRM", path: "/crm", iconName: "MessageSquare", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Müşteri", path: "/musteri-memnuniyeti", iconName: "Star", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Şubeler", path: "/subeler", iconName: "Building2", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  ],
  kalite_kontrol: [
    { label: "Denetim", path: "/denetim", iconName: "ClipboardCheck", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
    { label: "Kalite", path: "/kalite", iconName: "Shield", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Fabrika", path: "/fabrika/dashboard", iconName: "Factory", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  ],
  gida_muhendisi: [
    { label: "Reçeteler", path: "/receteler", iconName: "ChefHat", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Kalite", path: "/kalite", iconName: "Shield", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Fabrika", path: "/fabrika/dashboard", iconName: "Factory", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    { label: "Raporlar", path: "/raporlar", iconName: "BarChart3", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  ],
};

export function getQuickActionsForRole(role: string): QuickActionItem[] {
  return ROLE_QUICK_ACTIONS[role] || DEFAULT_ACTIONS;
}
