import type { NavItem, NavScope } from "./nav-registry";

const HQ_ROLES = new Set([
  "ceo", "cgo", "admin",
  "muhasebe", "muhasebe_ik", "satinalma", "marketing", "pazarlama",
  "teknik", "destek", "trainer", "coach", "kalite_kontrol",
  "fabrika_mudur", "fabrika", "yatirimci_hq", "ekipman_teknik", "ik",
  "gida_muhendisi",
]);

const BRANCH_ROLES = new Set([
  "mudur", "supervisor", "supervisor_buddy", "barista", "bar_buddy", "stajyer", "yatirimci_branch",
]);

const FACTORY_ROLES = new Set([
  "fabrika_mudur", "fabrika_operator", "fabrika_sorumlu", "fabrika_personel",
]);

export function getUserScope(role: string | undefined): NavScope | null {
  if (!role) return null;
  if (FACTORY_ROLES.has(role)) return "factory";
  if (BRANCH_ROLES.has(role)) return "branch";
  if (HQ_ROLES.has(role)) return "hq";
  return null;
}

export function canSeeNavItem(user: { role?: string; branchId?: number | null } | null | undefined, item: NavItem): boolean {
  if (!user?.role) return false;

  const scope = getUserScope(user.role);
  if (!scope) return false;

  if (!item.scopes.includes(scope)) return false;

  if (item.roles && item.roles.length > 0 && !item.roles.includes(user.role)) {
    return false;
  }

  return true;
}

export function checkRouteDuplicates(visibleItems: NavItem[]): void {
  if (import.meta.env.PROD) return;

  const routeMap = new Map<string, string[]>();
  for (const item of visibleItems) {
    if (item.route === "#search" || item.route === "/login") continue;
    const existing = routeMap.get(item.route);
    if (existing) {
      existing.push(`${item.id}(${item.defaultLabelTR})`);
    } else {
      routeMap.set(item.route, [`${item.id}(${item.defaultLabelTR})`]);
    }
  }

  routeMap.forEach((items, route) => {
    if (items.length > 1) {
      console.warn(`[NavRegistry] Duplicate route "${route}" used by: ${items.join(", ")}`);
    }
  });
}
