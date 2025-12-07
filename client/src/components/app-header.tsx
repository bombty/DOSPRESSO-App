import { Mail, LogOut, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dospressoLogo from "@assets/IMG_6637_1765138781125.png";
import type { User } from "@shared/schema";

interface AppHeaderProps {
  notificationCount?: number;
  user?: User | null;
  branchName?: string | null;
  onQRClick?: () => void;
}

export function AppHeader({ notificationCount = 0, user, branchName, onQRClick }: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleMailboxClick = () => {
    setLocation("/bildirimler");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getRoleLabel = (role: string | undefined) => {
    const roleMap: Record<string, string> = {
      "admin": "Admin",
      "supervisor": "Supervisor",
      "barista": "Barista",
      "supervisor_buddy": "Supervisor Buddy",
      "bar_buddy": "Bar Buddy",
      "stajyer": "Stajyer",
      "muhasebe": "Muhasebe",
      "coach": "Coach",
      "teknik": "Teknik",
      "destek": "Destek",
      "satinalma": "Satın Alma",
      "fabrika": "Fabrika",
      "yatirimci_hq": "Yatırımcı HQ",
      "yatirimci_branch": "Yatırımcı Şube",
      "hq_staff": "HQ Staff",
    };
    return role ? roleMap[role] || role : "";
  };

  return (
    <div className="sticky top-0 z-50 bg-background border-b">
      {/* Header - User Left + Logo Center + Mailbox Right */}
      <div className="px-3 py-2 border-b bg-[#1e3a5f] dark:bg-[#1e3a5f] flex items-center gap-3 relative">
        
        {/* Left: User Info Dropdown */}
        <div className="flex-shrink-0">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="justify-start p-0 h-auto cursor-pointer hover:bg-transparent"
                data-testid="button-profile-menu"
              >
                <div className="text-left min-w-0">
                  <p className="text-xs font-medium text-white" data-testid="text-user-name">
                    <span className="truncate">{user?.firstName || user?.username || "Kullanıcı"}</span>
                    <span className="text-gray-300 mx-1">•</span>
                    <span data-testid="text-user-role">{getRoleLabel(user?.role)}</span>
                  </p>
                  {branchName && (
                    <p className="text-[11px] text-gray-300 truncate" data-testid="text-branch-name">
                      {branchName}
                    </p>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center: Logo - Absolutely centered */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img 
            src={dospressoLogo} 
            alt="DOSPRESSO" 
            className="h-8 object-contain cursor-pointer"
            onClick={() => setLocation("/")}
            data-testid="img-dospresso-logo"
          />
        </div>

        {/* Right: QR + Mailbox - Grows to fill space */}
        <div className="flex-1 flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onQRClick}
            data-testid="button-qr-scanner"
            title="Hızlı QR Giriş"
          >
            <QrCode className="w-4 h-4 text-white" />
          </Button>
          <div className="relative flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleMailboxClick}
              data-testid="button-mailbox"
            >
              <Mail className="w-4 h-4 text-white" />
            </Button>
            {notificationCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-red-600 hover:bg-red-700"
                data-testid="badge-notification-count"
              >
                {notificationCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
