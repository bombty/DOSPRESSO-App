import { Mail, LogOut } from "lucide-react";
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
import dospressoLogo from "@assets/IMG_5044_1764674613097.jpeg";
import type { User } from "@shared/schema";

interface AppHeaderProps {
  notificationCount?: number;
  user?: User | null;
  branchName?: string | null;
}

export function AppHeader({ notificationCount = 0, user, branchName }: AppHeaderProps) {
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
      "supervisor": "Süpervizör",
      "barista": "Barista",
      "supervisor_buddy": "Süpervizör Buddy",
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
      <div className="px-3 py-2 border-b bg-white dark:bg-slate-950 flex items-center justify-between gap-3">
        
        {/* Left: User Info Dropdown */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="justify-start p-0 h-auto cursor-pointer hover:bg-transparent"
              data-testid="button-profile-menu"
            >
              <div className="text-left min-w-0">
                <p className="text-xs font-medium" data-testid="text-user-name">
                  <span className="truncate">{user?.firstName || user?.username || "Kullanıcı"}</span>
                  <span className="text-muted-foreground mx-1">•</span>
                  <span data-testid="text-user-role">{getRoleLabel(user?.role)}</span>
                </p>
                {branchName && (
                  <p className="text-[11px] text-muted-foreground truncate" data-testid="text-branch-name">
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

        {/* Center: Logo */}
        <img 
          src={dospressoLogo} 
          alt="DOSPRESSO" 
          className="h-8 object-contain cursor-pointer"
          onClick={() => setLocation("/")}
          data-testid="img-dospresso-logo"
        />

        {/* Right: Mailbox */}
        <div className="relative flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleMailboxClick}
            data-testid="button-mailbox"
          >
            <Mail className="w-4 h-4" />
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
  );
}
