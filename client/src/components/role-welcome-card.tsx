import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { type LucideIcon } from "lucide-react";

interface QuickLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface RoleWelcomeCardProps {
  roleDescription: string;
  quickLinks: QuickLink[];
  icon?: LucideIcon;
}

export function RoleWelcomeCard({ roleDescription, quickLinks, icon: HeaderIcon }: RoleWelcomeCardProps) {
  const { user } = useAuth();

  return (
    <div className="space-y-3">
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {HeaderIcon && (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <HeaderIcon className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h2 className="font-bold text-base" data-testid="text-welcome-greeting">
                Hoş geldiniz, {user?.firstName || 'Kullanıcı'}!
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-role-description">
                {roleDescription}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {quickLinks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="quick-links-grid">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-quick-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <link.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium leading-tight">{link.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
