import { LogOut, QrCode, Sun, Moon, CircleHelp, Headset, User as UserIcon } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { InboxDialog } from "@/components/inbox-dialog";
import dospressoLogo from "@assets/IMG_6637_1765138781125.png";
import type { User } from "@shared/schema";
import { getRoleHomePath } from "@/lib/role-routes";

interface AppHeaderProps {
  user?: User | null;
  branchName?: string | null;
  onQRClick?: () => void;
}

export function AppHeader({ user, branchName, onQRClick }: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { effectiveTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    queryClient.clear();
    window.location.href = "/login";
  };

  const getRoleLabel = (role: string | undefined) => {
    const roleMap: Record<string, string> = {
      "admin": "Admin",
      "ceo": "CEO",
      "cgo": "CGO",
      "muhasebe_ik": "Muhasebe İK",
      "satinalma": "Satınalma",
      "coach": "Coach",
      "marketing": "Marketing",
      "trainer": "Eğitmen",
      "kalite_kontrol": "Kalite Kontrol",
      "fabrika_mudur": "Fabrika Müdür",
      "muhasebe": "Muhasebe",
      "teknik": "Teknik",
      "destek": "Destek",
      "fabrika": "Fabrika",
      "yatirimci_hq": "Yatırımcı",
      "stajyer": "Stajyer",
      "bar_buddy": "Bar Buddy",
      "barista": "Barista",
      "supervisor_buddy": "Supervisor Buddy",
      "supervisor": "Supervisor",
      "mudur": "Müdür",
      "yatirimci_branch": "Yatırımcı",
      "fabrika_operator": "Fabrika Operatör",
      "fabrika_sorumlu": "Fabrika Sorumlu",
      "fabrika_personel": "Fabrika Personel",
    };
    return role ? roleMap[role] || role : "";
  };

  const SMALL_SIDEBAR_ROLES = [
    'stajyer', 'bar_buddy', 'barista',
    'yatirimci_branch', 'yatirimci_hq',
    'fabrika_operator', 'fabrika_personel',
  ];
  const hideHamburgerOnMobile = user?.role ? SMALL_SIDEBAR_ROLES.includes(user.role) : false;

  return (
    <div className="flex-shrink-0 z-50 bg-background border-b">
      <div className="px-3 py-2 border-b bg-[#122549] dark:bg-[#122549] flex items-center gap-3 relative">
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className={hideHamburgerOnMobile ? 'hidden' : 'md:hidden'}>
            <HamburgerMenu />
          </div>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="justify-start p-0 h-auto cursor-pointer hover:bg-transparent"
                data-testid="button-profile-menu"
              >
                <div className="text-left min-w-0 max-w-[120px] sm:max-w-[180px]">
                  <p className="text-xs font-medium text-white truncate" data-testid="text-user-name">
                    <span>{user?.firstName || user?.username || "Kullanıcı"}</span>
                    <span className="text-white/50 mx-1">•</span>
                    <span data-testid="text-user-role">{getRoleLabel(user?.role)}</span>
                  </p>
                  {branchName && (
                    <p className="text-[11px] text-white/60 truncate" data-testid="text-branch-name">
                      {branchName}
                    </p>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={() => { setIsOpen(false); setLocation(user ? `/personel/${user.id}` : "/login"); }} data-testid="button-profile">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profilim</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setIsOpen(false); setLocation("/hq-destek"); }} data-testid="button-support">
                <Headset className="mr-2 h-4 w-4" />
                <span>Destek</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img 
            src={dospressoLogo} 
            alt="DOSPRESSO" 
            className="h-8 object-contain cursor-pointer"
            onClick={() => {
              setLocation(getRoleHomePath(user?.role, user?.branchId));
            }}
            data-testid="img-dospresso-logo"
          />
        </div>

        <div className="flex-1 flex justify-end gap-1">
          <InboxDialog />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocation("/kullanim-kilavuzu")}
            data-testid="button-help"
            title="Kullanım Rehberi"
          >
            <CircleHelp className="w-4 h-4 text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
            title={effectiveTheme === "dark" ? "Açık Mod" : "Koyu Mod"}
          >
            {effectiveTheme === "dark" ? (
              <Sun className="w-4 h-4 text-white" />
            ) : (
              <Moon className="w-4 h-4 text-white" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onQRClick}
            data-testid="button-qr-scanner"
            title="QR Tarayıcı"
          >
            <QrCode className="w-4 h-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
