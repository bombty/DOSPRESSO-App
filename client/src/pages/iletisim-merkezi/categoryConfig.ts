import { Wrench, Package, Calculator, Megaphone, GraduationCap, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DepartmentDef {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
  slaLabel: string;
  assigneeRole: string;
}

export const DEPARTMENTS: readonly DepartmentDef[] = [
  {
    key: "teknik",
    label: "Teknik Destek",
    icon: Wrench,
    description: "Makine arızası, kalibrasyon, ekipman",
    slaLabel: "Kritik: 4s · Normal: 24s",
    assigneeRole: "teknik_sorumlu",
  },
  {
    key: "lojistik",
    label: "Lojistik & Sevkiyat",
    icon: Package,
    description: "Eksik ürün, geç teslimat, kalite sorunu",
    slaLabel: "24 saat",
    assigneeRole: "satinalma",
  },
  {
    key: "muhasebe",
    label: "Finans & Muhasebe",
    icon: Calculator,
    description: "Fatura, ödeme, cari hesap",
    slaLabel: "48 saat",
    assigneeRole: "muhasebe_ik",
  },
  {
    key: "marketing",
    label: "Marketing & Marka",
    icon: Megaphone,
    description: "Materyal, reklam, lansman desteği",
    slaLabel: "72 saat",
    assigneeRole: "cgo",
  },
  {
    key: "trainer",
    label: "Eğitim & Reçete",
    icon: GraduationCap,
    description: "Reçete sorusu, personel eğitimi",
    slaLabel: "48 saat",
    assigneeRole: "coach",
  },
  {
    key: "hr",
    label: "Personel & HR",
    icon: Users,
    description: "İşe alım, izin, maaş, disiplin",
    slaLabel: "72 saat",
    assigneeRole: "muhasebe_ik",
  },
] as const;

export type DepartmentKey = typeof DEPARTMENTS[number]["key"];

export const PRIORITIES = [
  { key: "dusuk", label: "Düşük", color: "text-muted-foreground" },
  { key: "normal", label: "Normal", color: "text-blue-600 dark:text-blue-400" },
  { key: "yuksek", label: "Yüksek", color: "text-amber-600 dark:text-amber-400" },
  { key: "kritik", label: "Kritik", color: "text-red-600 dark:text-red-400" },
] as const;

export const STATUSES = [
  { key: "acik", label: "Açık", variant: "outline" as const },
  { key: "islemde", label: "İşlemde", variant: "secondary" as const },
  { key: "beklemede", label: "Beklemede", variant: "secondary" as const },
  { key: "cozuldu", label: "Çözüldü", variant: "default" as const },
  { key: "kapatildi", label: "Kapatıldı", variant: "outline" as const },
] as const;

export function getDeptConfig(key: string) {
  return DEPARTMENTS.find(d => d.key === key);
}

export function getPriorityConfig(key: string) {
  return PRIORITIES.find(p => p.key === key);
}

export function getStatusConfig(key: string) {
  return STATUSES.find(s => s.key === key);
}

export const HQ_ROLES = ["admin", "ceo", "cgo", "muhasebe_ik", "satinalma", "coach", "trainer", "kalite_kontrol", "teknik_sorumlu"];

export const BRANCH_SCOPED_ROLES = ["supervisor", "mudur"];

export function isHQRole(role: string): boolean {
  return HQ_ROLES.includes(role);
}

export function canSeeAllTickets(role: string): boolean {
  return ["admin", "ceo", "cgo"].includes(role);
}

export function isBranchScopedRole(role: string): boolean {
  return BRANCH_SCOPED_ROLES.includes(role);
}

export function canAccessIletisimMerkezi(role: string): boolean {
  return isHQRole(role) || BRANCH_SCOPED_ROLES.includes(role);
}
