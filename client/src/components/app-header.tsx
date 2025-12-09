import { Mail, LogOut, QrCode, Search, X, User as UserIcon, Coffee, ClipboardList, Building2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dospressoLogo from "@assets/IMG_6637_1765138781125.png";
import type { User } from "@shared/schema";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Search result types
interface SearchResults {
  users: Array<{ id: string; firstName: string; lastName: string; role: string; branchId: number | null }>;
  recipes: Array<{ id: number; name: string; category: string }>;
  tasks: Array<{ id: number; title: string; status: string; branchId: number | null }>;
  branches: Array<{ id: number; name: string; address: string | null }>;
  equipment: Array<{ id: number; name: string; type: string; branchId: number | null }>;
}

interface AppHeaderProps {
  notificationCount?: number;
  user?: User | null;
  branchName?: string | null;
  onQRClick?: () => void;
}

export function AppHeader({ notificationCount = 0, user, branchName, onQRClick }: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  // Search query
  const { data: searchResults, isLoading: isSearching } = useQuery<SearchResults>({
    queryKey: ['/api/search', debouncedQuery],
    enabled: debouncedQuery.length >= 2,
  });

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

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

  const handleSearchResultClick = (type: string, id: string | number) => {
    setShowSearch(false);
    setSearchQuery("");
    
    switch (type) {
      case 'user':
        setLocation(`/ik?userId=${id}`);
        break;
      case 'recipe':
        setLocation(`/akademi/tarifler?recipeId=${id}`);
        break;
      case 'task':
        setLocation(`/gorevler?taskId=${id}`);
        break;
      case 'branch':
        setLocation(`/subeler?branchId=${id}`);
        break;
      case 'equipment':
        setLocation(`/ekipman?equipmentId=${id}`);
        break;
    }
  };

  const hasResults = searchResults && (
    searchResults.users.length > 0 ||
    searchResults.recipes.length > 0 ||
    searchResults.tasks.length > 0 ||
    searchResults.branches.length > 0 ||
    searchResults.equipment.length > 0
  );

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

        {/* Right: Search + QR + Mailbox - Grows to fill space */}
        <div className="flex-1 flex justify-end gap-1">
          {/* Search */}
          <div ref={searchContainerRef} className="relative">
            {showSearch ? (
              <div className="flex items-center gap-1">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-32 sm:w-48 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  data-testid="input-global-search"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                  data-testid="button-close-search"
                >
                  <X className="w-4 h-4 text-white" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowSearch(true)}
                data-testid="button-open-search"
                title="Ara"
              >
                <Search className="w-4 h-4 text-white" />
              </Button>
            )}
            
            {/* Search Results Dropdown */}
            {showSearch && debouncedQuery.length >= 2 && (
              <div className="absolute top-full right-0 mt-1 w-72 sm:w-80 bg-background border rounded-md shadow-lg max-h-80 overflow-y-auto z-50" data-testid="dropdown-search-results">
                {isSearching ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">Aranıyor...</div>
                ) : !hasResults ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">Sonuç bulunamadı</div>
                ) : (
                  <div className="py-1">
                    {/* Users */}
                    {searchResults?.users && searchResults.users.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">Personel</div>
                        {searchResults.users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleSearchResultClick('user', u.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                            data-testid={`search-result-user-${u.id}`}
                          >
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{u.firstName} {u.lastName}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">{u.role}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Recipes */}
                    {searchResults?.recipes && searchResults.recipes.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">Tarifler</div>
                        {searchResults.recipes.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => handleSearchResultClick('recipe', r.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                            data-testid={`search-result-recipe-${r.id}`}
                          >
                            <Coffee className="w-4 h-4 text-muted-foreground" />
                            <span>{r.name}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">{r.category}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Tasks */}
                    {searchResults?.tasks && searchResults.tasks.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">Görevler</div>
                        {searchResults.tasks.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleSearchResultClick('task', t.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                            data-testid={`search-result-task-${t.id}`}
                          >
                            <ClipboardList className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate flex-1">{t.title}</span>
                            <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Branches */}
                    {searchResults?.branches && searchResults.branches.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">Şubeler</div>
                        {searchResults.branches.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => handleSearchResultClick('branch', b.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                            data-testid={`search-result-branch-${b.id}`}
                          >
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>{b.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Equipment */}
                    {searchResults?.equipment && searchResults.equipment.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">Ekipman</div>
                        {searchResults.equipment.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => handleSearchResultClick('equipment', e.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                            data-testid={`search-result-equipment-${e.id}`}
                          >
                            <Wrench className="w-4 h-4 text-muted-foreground" />
                            <span>{e.name}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">{e.type}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
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
