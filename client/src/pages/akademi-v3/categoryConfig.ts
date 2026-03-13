import {
  Coffee,
  Shield,
  Wrench,
  Users,
  Star,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface CategoryDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  colorClass: string;
}

export const CATEGORY_CONFIG: CategoryDef[] = [
  { id: "barista_temelleri", label: "Barista Temelleri", shortLabel: "Barista", icon: Coffee, colorClass: "text-orange-500 dark:text-orange-400" },
  { id: "hijyen_guvenlik", label: "Hijyen & Güvenlik", shortLabel: "Güvenlik", icon: Shield, colorClass: "text-green-500 dark:text-green-400" },
  { id: "ekipman", label: "Ekipman", shortLabel: "Ekipman", icon: Wrench, colorClass: "text-blue-500 dark:text-blue-400" },
  { id: "musteri_iliskileri", label: "Müşteri Hizm.", shortLabel: "Müşteri", icon: Star, colorClass: "text-yellow-500 dark:text-yellow-400" },
  { id: "yonetim", label: "Yönetim", shortLabel: "Yönetim", icon: Users, colorClass: "text-purple-500 dark:text-purple-400" },
  { id: "onboarding", label: "Onboarding", shortLabel: "Onboarding", icon: BookOpen, colorClass: "text-cyan-500 dark:text-cyan-400" },
  { id: "genel_gelisim", label: "Genel Gelişim", shortLabel: "Gelişim", icon: GraduationCap, colorClass: "text-pink-500 dark:text-pink-400" },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_CONFIG.map((c) => [c.id, c.label])
);

export const FILTER_CATEGORIES = [
  { id: "all", label: "Tümü" },
  ...CATEGORY_CONFIG.map((c) => ({ id: c.id, label: c.shortLabel })),
];
