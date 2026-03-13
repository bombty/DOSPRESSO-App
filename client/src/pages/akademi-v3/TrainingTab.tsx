import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Clock,
  Search,
  AlertCircle,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  barista_temelleri: "Barista Temelleri",
  hijyen_guvenlik: "Hijyen & Güvenlik",
  ekipman: "Ekipman",
  musteri_iliskileri: "Müşteri Hizmetleri",
  yonetim: "Yönetim",
  genel_gelisim: "Genel Gelişim",
  onboarding: "Onboarding",
};

const FILTER_CATEGORIES = [
  { id: "all", label: "Tümü" },
  { id: "barista_temelleri", label: "Barista" },
  { id: "hijyen_guvenlik", label: "Güvenlik" },
  { id: "ekipman", label: "Ekipman" },
  { id: "musteri_iliskileri", label: "Müşteri" },
  { id: "yonetim", label: "Yönetim" },
  { id: "onboarding", label: "Onboarding" },
  { id: "genel_gelisim", label: "Gelişim" },
];

function TrainingTabSkeleton() {
  return (
    <div className="space-y-3 p-4" data-testid="training-skeleton">
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function TrainingTab() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"zorunlu" | "istege">("zorunlu");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filter === "zorunlu") params.set("mandatory", "true");
    if (filter === "istege") params.set("mandatory", "false");
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    return params.toString();
  };

  const { data: modules, isLoading } = useQuery<any[]>({
    queryKey: ["/api/v3/academy/modules", { filter, categoryFilter, search: searchTerm }],
    queryFn: async () => {
      const qs = buildQueryString();
      const res = await fetch(`/api/v3/academy/modules?${qs}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Modüller yüklenemedi");
      return res.json();
    },
  });

  if (isLoading && !modules) {
    return <TrainingTabSkeleton />;
  }

  return (
    <div className="space-y-4 p-4 pb-8" data-testid="training-tab">
      <div className="flex gap-2" data-testid="training-filter-toggle">
        <Button
          variant={filter === "zorunlu" ? "default" : "secondary"}
          className="flex-1"
          onClick={() => setFilter("zorunlu")}
          data-testid="filter-mandatory"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Zorunlu
        </Button>
        <Button
          variant={filter === "istege" ? "default" : "secondary"}
          className="flex-1"
          onClick={() => setFilter("istege")}
          data-testid="filter-optional"
        >
          İsteğe Bağlı
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap" data-testid="category-filter-bar">
        {FILTER_CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            size="sm"
            variant={categoryFilter === cat.id ? "default" : "outline"}
            className="shrink-0"
            onClick={() => setCategoryFilter(cat.id)}
            data-testid={`cat-filter-${cat.id}`}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      <div className="relative" data-testid="training-search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Modül ara..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="search-input"
        />
      </div>

      {filter === "zorunlu" && modules && modules.length > 0 && (
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold" data-testid="mandatory-count">
          {modules.length} zorunlu modül
        </p>
      )}

      <div className="space-y-2" data-testid="modules-list">
        {modules?.map((mod: any) => {
          const progress = Number(mod.progress ?? 0);
          const isUrgent = mod.isMandatory && mod.deadlineDays && mod.deadlineDays <= 3;
          return (
            <Card
              key={mod.id}
              className={`hover-elevate cursor-pointer ${isUrgent ? "border-destructive/30 bg-destructive/5" : ""}`}
              onClick={() => setLocation(`/akademi-modul/${mod.id}`)}
              data-testid={`module-card-${mod.id}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? "bg-destructive/10" : "bg-muted"}`}>
                  <BookOpen className={`h-5 w-5 ${isUrgent ? "text-destructive" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    {isUrgent && (
                      <Badge variant="destructive" data-testid={`urgent-badge-${mod.id}`}>
                        ACİL
                      </Badge>
                    )}
                  </div>
                  <div className="font-medium text-sm truncate" data-testid={`module-title-${mod.id}`}>{mod.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    {mod.estimatedDuration && (
                      <span data-testid={`module-duration-${mod.id}`}>
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {mod.estimatedDuration} dk
                      </span>
                    )}
                    {mod.deadlineDays && (
                      <span data-testid={`module-deadline-${mod.id}`}>Son: {mod.deadlineDays} gün</span>
                    )}
                    {mod.category && (
                      <Badge variant="secondary" data-testid={`module-category-${mod.id}`}>
                        {CATEGORY_LABELS[mod.category] || mod.category}
                      </Badge>
                    )}
                  </div>
                  {progress > 0 && (
                    <div className="mt-2">
                      <Progress value={progress} className="h-1.5" />
                      <div className="text-xs text-muted-foreground mt-0.5" data-testid={`module-progress-${mod.id}`}>
                        %{progress} tamamlandı
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={isUrgent ? "default" : "secondary"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/akademi-modul/${mod.id}`);
                  }}
                  data-testid={`open-module-${mod.id}`}
                >
                  {progress > 0 ? "Devam" : "Başla"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {modules?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground" data-testid="no-modules">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Bu filtrelere uygun modül bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}
