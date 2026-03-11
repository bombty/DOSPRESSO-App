import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { isHQRole } from "@shared/schema";
import { useLocation } from "wouter";
import {
  BookOpen,
  Clock,
  CheckCircle,
  PlayCircle,
  Circle,
  Search,
  Filter,
  GraduationCap,
  Coffee,
  Brain,
  Target,
  Flame,
  Star,
  Zap,
  Trophy,
  Snowflake,
  IceCream,
  Citrus,
  Droplets,
  Leaf,
  Package,
  CircleDot,
  Flower2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

type StatusFilter = "all" | "not_started" | "in_progress" | "completed";

const CATEGORY_LABELS: Record<string, string> = {
  barista_temelleri: "Barista Temelleri",
  hijyen_guvenlik: "Hijyen & Güvenlik",
  receteler: "Reçeteler",
  musteri_iliskileri: "Müşteri İlişkileri",
  ekipman: "Ekipman Kullanımı",
  yonetim: "Yönetim & Liderlik",
  onboarding: "Oryantasyon",
  genel_gelisim: "Genel Gelişim",
  barista: "Barista",
  supervisor: "Supervisor",
  hygiene: "Hijyen",
  culture: "Kültür",
  safety: "Güvenlik",
  recipe: "Reçete",
  general: "Genel",
  management: "Yönetim",
  customer_service: "Müşteri Hizmetleri",
  equipment: "Ekipman",
  quality: "Kalite",
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: "Başlangıç", color: "text-green-600 dark:text-green-400" },
  intermediate: { label: "Orta", color: "text-amber-600 dark:text-amber-400" },
  advanced: { label: "İleri", color: "text-red-600 dark:text-red-400" },
};

const ICON_MAP: Record<string, any> = {
  Target, Coffee, BookOpen, Brain, GraduationCap,
  Snowflake, IceCream, Citrus, Droplets, Leaf, Package, CircleDot, Flower2,
  Trophy, Flame, Star, Zap, CheckCircle,
};

function getCategoryIcon(category: string) {
  const iconMap: Record<string, any> = {
    barista: Coffee,
    supervisor: Target,
    hygiene: Droplets,
    culture: Star,
    safety: Zap,
    recipe: Coffee,
    onboarding: GraduationCap,
    general: BookOpen,
    management: Target,
    customer_service: Star,
    equipment: Package,
    quality: CheckCircle,
  };
  return iconMap[category] || BookOpen;
}

export default function AcademyExplore() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const initialCategory = (() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("kategori") || null;
  })();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: modules = [], isLoading: modulesLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/training/modules"],
  });

  const { data: userProgressData, isLoading: progressLoading } = useQuery<any>({
    queryKey: ["/api/training/progress", user?.id],
    enabled: !!user?.id,
  });

  const { data: completedStats } = useQuery<any>({
    queryKey: ["/api/training/user-modules-stats", user?.id],
    enabled: !!user?.id,
  });

  const userProgress: any[] = useMemo(() => {
    if (!userProgressData) return [];
    if (Array.isArray(userProgressData)) return userProgressData;
    if (userProgressData.summary) return userProgressData.summary;
    if (userProgressData.completions) return userProgressData.completions;
    return [];
  }, [userProgressData]);

  const getModuleStatus = (moduleId: number): "not_started" | "in_progress" | "completed" => {
    if (!Array.isArray(userProgress)) return "not_started";
    const progress = userProgress.find((p: any) => p.moduleId === moduleId);
    if (!progress) return "not_started";
    if (progress.status === "completed" || progress.completedAt) return "completed";
    if (progress.status === "in_progress") return "in_progress";
    return "not_started";
  };

  const getModuleScore = (moduleId: number): number | null => {
    if (!Array.isArray(userProgress)) return null;
    const progress = userProgress.find((p: any) => p.moduleId === moduleId);
    if (!progress || !progress.score) return null;
    return progress.score;
  };

  const approvedModules = useMemo(() => {
    return modules.filter((m: any) => {
      if (m.deletedAt) return false;
      if (m.status && m.status !== "approved") return false;
      if (!m.isPublished && !m.status) return false;
      return true;
    });
  }, [modules]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    approvedModules.forEach((m: any) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [approvedModules]);

  const filteredModules = useMemo(() => {
    return approvedModules.filter((m: any) => {
      if (selectedCategory && m.category !== selectedCategory) return false;

      if (statusFilter !== "all") {
        const status = getModuleStatus(m.id);
        if (status !== statusFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase('tr-TR');
        const titleMatch = m.title?.toLocaleLowerCase('tr-TR').includes(q);
        const descMatch = m.description?.toLocaleLowerCase('tr-TR').includes(q);
        const catMatch = m.category?.toLocaleLowerCase('tr-TR').includes(q);
        if (!titleMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [approvedModules, selectedCategory, statusFilter, searchQuery, userProgress]);

  const statusCounts = useMemo(() => {
    const counts = { all: approvedModules.length, not_started: 0, in_progress: 0, completed: 0 };
    approvedModules.forEach((m: any) => {
      const status = getModuleStatus(m.id);
      counts[status]++;
    });
    return counts;
  }, [approvedModules, userProgress]);

  const handleModuleClick = (module: any) => {
    navigate(`/akademi/genel-egitimler`);
  };

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Tümü" },
    { key: "not_started", label: "Başlanmamış" },
    { key: "in_progress", label: "Devam Eden" },
    { key: "completed", label: "Tamamlanan" },
  ];

  if (modulesLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Modül ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-modules"
          />
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span data-testid="text-module-count">{filteredModules.length} modül</span>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-1">
          <Button
            size="sm"
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            data-testid="chip-category-all"
          >
            Tümü
          </Button>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat);
            return (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                data-testid={`chip-category-${cat}`}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {CATEGORY_LABELS[cat] || cat}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((sf) => (
          <Button
            key={sf.key}
            size="sm"
            variant={statusFilter === sf.key ? "default" : "outline"}
            onClick={() => setStatusFilter(sf.key)}
            data-testid={`filter-status-${sf.key}`}
          >
            {sf.label}
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {statusCounts[sf.key]}
            </Badge>
          </Button>
        ))}
      </div>

      {filteredModules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium" data-testid="text-no-results">
              Aramanızla eşleşen modül bulunamadı
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Filtreleri değiştirmeyi veya arama terimini güncellemeyi deneyin
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredModules.map((module: any) => {
            const status = getModuleStatus(module.id);
            const score = getModuleScore(module.id);
            const CatIcon = getCategoryIcon(module.category);
            const difficulty = DIFFICULTY_LABELS[module.level] || DIFFICULTY_LABELS.beginner;

            return (
              <Card
                key={module.id}
                className="cursor-pointer hover-elevate transition-all"
                onClick={() => handleModuleClick(module)}
                data-testid={`card-module-${module.id}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CatIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2" data-testid={`text-module-title-${module.id}`}>
                          {module.title}
                        </h3>
                        {module.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {module.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusIndicator status={status} />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {module.category && (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${module.id}`}>
                        {CATEGORY_LABELS[module.category] || module.category}
                      </Badge>
                    )}
                    {module.estimatedDuration && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {module.estimatedDuration} dk
                      </span>
                    )}
                    <span className={`flex items-center gap-1 text-xs ${difficulty.color}`}>
                      <DifficultyDots level={module.level} />
                      {difficulty.label}
                    </span>
                    {score !== null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-score-${module.id}`}>
                        <Trophy className="h-3 w-3 text-amber-500" />
                        %{score}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusIndicator({ status }: { status: "not_started" | "in_progress" | "completed" }) {
  if (status === "completed") {
    return (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400" data-testid="status-completed">
        <CheckCircle className="h-4 w-4" />
      </div>
    );
  }
  if (status === "in_progress") {
    return (
      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400" data-testid="status-in-progress">
        <PlayCircle className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-muted-foreground" data-testid="status-not-started">
      <Circle className="h-4 w-4" />
    </div>
  );
}

function DifficultyDots({ level }: { level: string }) {
  const filled = level === "advanced" ? 3 : level === "intermediate" ? 2 : 1;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((dot) => (
        <div
          key={dot}
          className={`w-1.5 h-1.5 rounded-full ${
            dot <= filled ? "bg-current" : "bg-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}
