import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ListSkeleton } from "@/components/list-skeleton";
import {
  ClipboardCheck,
  Plus,
  Send,
  Calendar,
  Building2,
  CheckSquare,
  SlidersHorizontal,
  FileText,
  History,
  AlertTriangle,
  Target,
  User,
  Weight,
} from "lucide-react";

interface InspectionCategory {
  key: string;
  label: string;
  weight: number;
  items: string[];
}

interface Branch {
  id: number;
  name: string;
}

interface PastInspection {
  id: number;
  branchId: number;
  branchName: string;
  auditorName: string;
  auditDate: string;
  overallScore: number;
  notes: string | null;
  followUpRequired: boolean;
  exteriorScore: number;
  buildingAppearanceScore: number;
  barLayoutScore: number;
  storageScore: number;
  productPresentationScore: number;
  staffBehaviorScore: number;
  dressCodeScore: number;
  cleanlinessScore: number;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 75) return "text-amber-600 dark:text-amber-400";
  if (score >= 50) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBadgeVariant(score: number): string {
  if (score >= 90) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 75) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (score >= 50) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

function getProgressColor(score: number): string {
  if (score >= 90) return "[&>div]:bg-green-500";
  if (score >= 75) return "[&>div]:bg-amber-500";
  if (score >= 50) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-red-500";
}

export default function CoachSubeDenetim() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("yeni");

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split("T")[0]);
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean[]>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [categoryNotes, setCategoryNotes] = useState<Record<string, string>>({});
  const [userOverridden, setUserOverridden] = useState<Record<string, boolean>>({});

  const { data: categories, isLoading: categoriesLoading } = useQuery<InspectionCategory[]>({
    queryKey: ["/api/inspection-categories"],
  });

  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: pastInspections, isLoading: historyLoading } = useQuery<PastInspection[]>({
    queryKey: ["/api/branch-inspections"],
  });

  useEffect(() => {
    if (categories && Object.keys(checkedItems).length === 0) {
      const initialChecked: Record<string, boolean[]> = {};
      const initialScores: Record<string, number> = {};
      categories.forEach((cat) => {
        initialChecked[cat.key] = new Array(cat.items.length).fill(false);
        initialScores[cat.key] = 0;
      });
      setCheckedItems(initialChecked);
      setScores(initialScores);
    }
  }, [categories]);

  const handleCheckItem = (categoryKey: string, itemIndex: number, checked: boolean) => {
    setCheckedItems((prev) => {
      const updated = { ...prev };
      updated[categoryKey] = [...(updated[categoryKey] || [])];
      updated[categoryKey][itemIndex] = checked;
      return updated;
    });

    if (!userOverridden[categoryKey]) {
      const items = checkedItems[categoryKey] || [];
      const newItems = [...items];
      newItems[itemIndex] = checked;
      const checkedCount = newItems.filter(Boolean).length;
      const suggestedScore = checkedCount * 20;
      setScores((prev) => ({ ...prev, [categoryKey]: suggestedScore }));
    }
  };

  const handleSliderChange = (categoryKey: string, value: number[]) => {
    setScores((prev) => ({ ...prev, [categoryKey]: value[0] }));
    setUserOverridden((prev) => ({ ...prev, [categoryKey]: true }));
  };

  const overallScore = useMemo(() => {
    if (!categories) return 0;
    let totalWeighted = 0;
    let totalWeight = 0;
    categories.forEach((cat) => {
      const score = scores[cat.key] ?? 0;
      totalWeighted += score * cat.weight;
      totalWeight += cat.weight;
    });
    return totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;
  }, [categories, scores]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return await apiRequest("POST", "/api/branch-inspections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-inspections"] });
      toast({ title: "Başarılı", description: "Denetim başarıyla kaydedildi" });
      resetForm();
      setActiveTab("gecmis");
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Denetim kaydedilirken hata olustu",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedBranchId("");
    setAuditDate(new Date().toISOString().split("T")[0]);
    setFollowUpRequired(false);
    setGeneralNotes("");
    setCategoryNotes({});
    setUserOverridden({});
    if (categories) {
      const initialChecked: Record<string, boolean[]> = {};
      const initialScores: Record<string, number> = {};
      categories.forEach((cat) => {
        initialChecked[cat.key] = new Array(cat.items.length).fill(false);
        initialScores[cat.key] = 0;
      });
      setCheckedItems(initialChecked);
      setScores(initialScores);
    }
  };

  const handleSubmit = () => {
    if (!selectedBranchId) {
      toast({ title: "Hata", description: "Lütfen bir şube seçin", variant: "destructive" });
      return;
    }

    const body: Record<string, unknown> = {
      branchId: parseInt(selectedBranchId),
      auditDate,
      overallScore,
      notes: generalNotes,
      categoryNotes,
      followUpRequired,
      photoUrls: [],
      serviceQualityScore: 0,
      productQualityScore: 0,
      safetyComplianceScore: 0,
      equipmentMaintenanceScore: 0,
    };

    if (categories) {
      categories.forEach((cat) => {
        body[cat.key] = scores[cat.key] ?? 0;
      });
    }

    createMutation.mutate(body);
  };

  if (categoriesLoading || branchesLoading) {
    return (
      <div className="p-4 space-y-4">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-sube-denetim">
            Sube Denetim
          </h1>
          <p className="text-sm text-muted-foreground">Coach sube denetim formu</p>
        </div>
        <Button
          data-testid="button-yeni-denetim"
          onClick={() => {
            resetForm();
            setActiveTab("yeni");
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Denetim
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="yeni" data-testid="tab-yeni-denetim">
            <ClipboardCheck className="w-4 h-4 mr-1 hidden sm:inline" />
            Yeni Denetim
          </TabsTrigger>
          <TabsTrigger value="gecmis" data-testid="tab-denetim-gecmisi">
            <History className="w-4 h-4 mr-1 hidden sm:inline" />
            Denetim Gecmisi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="yeni" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Sube
                  </label>
                  <Select
                    value={selectedBranchId}
                    onValueChange={setSelectedBranchId}
                  >
                    <SelectTrigger data-testid="select-branch">
                      <SelectValue placeholder="Şube seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem
                          key={branch.id}
                          value={branch.id.toString()}
                          data-testid={`option-branch-${branch.id}`}
                        >
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Denetim Tarihi
                  </label>
                  <Input
                    type="date"
                    value={auditDate}
                    onChange={(e) => setAuditDate(e.target.value)}
                    data-testid="input-audit-date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories?.map((cat) => {
              const catScore = scores[cat.key] ?? 0;
              const catChecked = checkedItems[cat.key] || [];
              const checkedCount = catChecked.filter(Boolean).length;

              return (
                <Card key={cat.key} data-testid={`card-category-${cat.key}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckSquare className="w-4 h-4" />
                        {cat.label}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Weight className="w-3 h-3 mr-1" />
                          Agirlik: %{cat.weight}
                        </Badge>
                        <Badge className={getScoreBadgeVariant(catScore)}>
                          {catScore}/100
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {cat.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Checkbox
                            id={`${cat.key}-item-${idx}`}
                            checked={catChecked[idx] || false}
                            onCheckedChange={(checked) =>
                              handleCheckItem(cat.key, idx, !!checked)
                            }
                            data-testid={`checkbox-${cat.key}-${idx}`}
                          />
                          <label
                            htmlFor={`${cat.key}-item-${idx}`}
                            className="text-sm leading-tight cursor-pointer"
                          >
                            {item}
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {checkedCount}/5 madde isaretlendi
                      {!userOverridden[cat.key] && " (otomatik skor)"}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-medium flex items-center gap-1">
                          <SlidersHorizontal className="w-3 h-3" />
                          Skor
                        </label>
                        <span className={`text-sm font-bold ${getScoreColor(catScore)}`}>
                          {catScore}
                        </span>
                      </div>
                      <Slider
                        value={[catScore]}
                        onValueChange={(val) => handleSliderChange(cat.key, val)}
                        max={100}
                        step={5}
                        data-testid={`slider-${cat.key}`}
                      />
                      <Progress
                        value={catScore}
                        className={`h-1 ${getProgressColor(catScore)}`}
                      />
                    </div>

                    <Textarea
                      placeholder="Kategori notlari..."
                      value={categoryNotes[cat.key] || ""}
                      onChange={(e) =>
                        setCategoryNotes((prev) => ({
                          ...prev,
                          [cat.key]: e.target.value,
                        }))
                      }
                      rows={2}
                      className="text-sm"
                      data-testid={`textarea-notes-${cat.key}`}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card data-testid="card-overall-score">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  <span className="font-semibold text-lg">Genel Skor</span>
                </div>
                <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`} data-testid="text-overall-score">
                  {overallScore}/100
                </span>
              </div>
              <Progress
                value={overallScore}
                className={`h-2 ${getProgressColor(overallScore)}`}
              />

              {categories && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {categories.map((cat) => (
                    <div key={cat.key} className="flex items-center justify-between gap-1 p-2 rounded-md bg-muted/50">
                      <span className="truncate">{cat.label}</span>
                      <span className={`font-bold ${getScoreColor(scores[cat.key] ?? 0)}`}>
                        {scores[cat.key] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                placeholder="Genel denetim notlari..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={3}
                data-testid="textarea-general-notes"
              />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="follow-up"
                  checked={followUpRequired}
                  onCheckedChange={(checked) => setFollowUpRequired(!!checked)}
                  data-testid="checkbox-follow-up"
                />
                <label htmlFor="follow-up" className="text-sm cursor-pointer flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Takip gerekli
                </label>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={createMutation.isPending || !selectedBranchId}
                data-testid="button-submit-inspection"
              >
                {createMutation.isPending ? (
                  "Kaydediliyor..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Denetimi Kaydet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gecmis" className="space-y-4 mt-4">
          {historyLoading ? (
            <ListSkeleton count={4} variant="card" />
          ) : !pastInspections || pastInspections.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Henuz denetim kaydi bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastInspections.map((inspection) => (
                <Card key={inspection.id} data-testid={`card-inspection-${inspection.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold" data-testid={`text-branch-name-${inspection.id}`}>
                          {inspection.branchName || `Sube #${inspection.branchId}`}
                        </span>
                      </div>
                      <Badge
                        className={getScoreBadgeVariant(inspection.overallScore)}
                        data-testid={`badge-score-${inspection.id}`}
                      >
                        {inspection.overallScore}/100
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {inspection.auditDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {inspection.auditorName || "Bilinmiyor"}
                      </span>
                    </div>

                    <Progress
                      value={inspection.overallScore}
                      className={`h-1.5 ${getProgressColor(inspection.overallScore)}`}
                    />

                    {inspection.followUpRequired && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        Takip gerekli
                      </div>
                    )}

                    {inspection.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {inspection.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}