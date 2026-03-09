import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Library,
  Plus,
  Edit,
  Eye,
  Users,
  Package,
  BookOpen,
  FileText,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";

interface ContentPack {
  id: number;
  titleTr: string;
  titleEn: string | null;
  description: string | null;
  category: string;
  targetRoles: string[];
  itemCount: number;
  isActive: boolean;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  gate_prep: "Gate Hazırlık",
  kpi_remediation: "KPI İyileştirme",
  elective: "Seçmeli",
  certification: "Sertifika",
};

const CATEGORY_ICONS: Record<string, any> = {
  onboarding: BookOpen,
  gate_prep: ClipboardCheck,
  kpi_remediation: FileText,
  elective: Package,
  certification: FileText,
};

export default function CoachContentLibrary() {
  const { toast } = useToast();

  const { data: packs, isLoading, isError, refetch } = useQuery<ContentPack[]>({
    queryKey: ['/api/academy/content-packs'],
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="coach-content-loading">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
        <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
        <Button onClick={() => refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
      </div>
    );
  }

  const activePacks = (packs || []).filter(p => p.isActive);
  const inactivePacks = (packs || []).filter(p => !p.isActive);

  const groupedByCategory = activePacks.reduce((acc, pack) => {
    const cat = pack.category || 'elective';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(pack);
    return acc;
  }, {} as Record<string, ContentPack[]>);

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto" data-testid="coach-content-library">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">İçerik Kütüphanesi</h2>
          <Badge variant="secondary">{activePacks.length} paket</Badge>
        </div>
        <Button size="sm" data-testid="button-create-pack">
          <Plus className="h-4 w-4 mr-1" />
          Yeni Paket
        </Button>
      </div>

      {Object.entries(groupedByCategory).map(([category, categoryPacks]) => {
        const Icon = CATEGORY_ICONS[category] || Package;
        return (
          <div key={category} data-testid={`category-${category}`}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{CATEGORY_LABELS[category] || category}</h3>
              <Badge variant="outline">{categoryPacks.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryPacks.map(pack => (
                <Card key={pack.id} className="hover-elevate" data-testid={`pack-card-${pack.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm truncate">{pack.titleTr}</h4>
                        {pack.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pack.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary">{pack.itemCount} öğe</Badge>
                          {pack.targetRoles?.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {pack.targetRoles.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" data-testid={`button-preview-pack-${pack.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" data-testid={`button-edit-pack-${pack.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" data-testid={`button-assign-pack-${pack.id}`}>
                          <Users className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {activePacks.length === 0 && (
        <Card data-testid="no-packs">
          <CardContent className="p-6 text-center">
            <Library className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Henüz içerik paketi yok</p>
            <p className="text-sm text-muted-foreground mt-1">
              "Yeni Paket" butonuna tıklayarak ilk içerik paketinizi oluşturun.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
