import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Lightbulb,
  ListChecks,
  Bot,
  Send,
  Loader2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Users,
  Settings,
  HardDrive,
  Building2,
  Wrench,
  GraduationCap,
  BarChart3,
  FileText,
  Star,
  Shield,
  Factory,
  Tablet,
  Grid,
  Clock,
  AlertTriangle,
  QrCode,
  Headphones,
  Bell,
  MessageSquare,
  Calculator,
  Calendar,
  UserCheck,
  CheckSquare,
  ClipboardList,
  Home,
  Package,
  Truck,
  ClipboardCheck,
  MessageSquareHeart,
  TrendingUp,
  ShoppingCart,
  Crown,
  Megaphone,
  Search,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

interface RoleGuideContent {
  roleKey: string;
  roleTitle: string;
  roleDescription: string;
  availableModules: Array<{
    name: string;
    description: string;
    icon: string;
    path: string;
    detailedSteps?: string[];
  }>;
  quickTips: string[];
  commonTasks: Array<{
    title: string;
    steps: string[];
  }>;
  restrictions: string[];
}

interface GuideDoc {
  id: number;
  title: string;
  slug: string;
  content: string;
  category: string;
  sortOrder: number;
  createdAt: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Users, Settings, HardDrive, Building2, Wrench,
  GraduationCap, BarChart3, FileText, Star, Shield, Factory, Tablet,
  Grid, Clock, AlertTriangle, QrCode, Headphones, Bell, MessageSquare,
  Calculator, Calendar, UserCheck, CheckSquare, ClipboardList, Home,
  BookOpen, Package, Truck, ClipboardCheck, MessageSquareHeart,
  TrendingUp, ShoppingCart, Crown, Megaphone, Bot,
  BarChart: BarChart3, PackageCheck: Package,
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || BookOpen;
}

const CATEGORY_LABELS: Record<string, string> = {
  genel: "Genel",
  operasyon: "Operasyon",
  teknik: "Teknik",
  ik: "IK & Vardiya",
  egitim: "Egitim",
};

function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-base font-medium mt-3 mb-1">{line.slice(4)}</h3>;
        }
        if (line.startsWith('- **')) {
          const match = line.match(/^- \*\*(.+?)\*\*:\s*(.+)/);
          if (match) {
            return (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary font-bold shrink-0">-</span>
                <span><strong>{match[1]}</strong>: {match[2]}</span>
              </div>
            );
          }
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary font-bold shrink-0">-</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\.\s(.+)/);
          if (num) {
            return (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="shrink-0 text-xs">{num[1]}</Badge>
                <span>{num[2]}</span>
              </div>
            );
          }
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
      })}
    </div>
  );
}

export default function KullanimKilavuzu() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("rehber");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<GuideDoc | null>(null);

  const { data: guide, isLoading } = useQuery<RoleGuideContent>({
    queryKey: ["/api/me/usage-guide"],
  });

  const { data: guideDocs = [], isLoading: isDocsLoading } = useQuery<GuideDoc[]>({
    queryKey: ["/api/guide-docs", searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory) params.set("category", selectedCategory);
      const res = await fetch(`/api/guide-docs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/me/usage-guide/ask", { question: q });
      return res.json();
    },
    onSuccess: (data: { answer: string }) => {
      setAiAnswer(data.answer);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Yanit alinamadi, lutfen tekrar deneyin.",
        variant: "destructive",
      });
    },
  });

  const handleAsk = () => {
    if (!question.trim()) return;
    setAiAnswer("");
    askMutation.mutate(question.trim());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-guide">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 pb-24 space-y-4">
        <div className="space-y-2" data-testid="section-header">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Kullanim Kilavuzu</h1>
          </div>
          {guide && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" data-testid="badge-role">{guide.roleTitle}</Badge>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-guide">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rehber" data-testid="tab-rehber">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Rol Rehberi
            </TabsTrigger>
            <TabsTrigger value="dokumanlar" data-testid="tab-dokumanlar">
              <FileText className="h-4 w-4 mr-2" />
              Dokumanlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rehber" className="space-y-6 mt-4">
            {guide ? (
              <>
                <p className="text-muted-foreground text-sm" data-testid="text-role-description">{guide.roleDescription}</p>

                {guide.availableModules.length > 0 && (
                  <section data-testid="section-modules">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <LayoutDashboard className="h-5 w-5" />
                      Erisilebilir Moduller
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {guide.availableModules.map((mod, i) => {
                        const IconComp = getIcon(mod.icon);
                        const isExpanded = expandedModule === i;
                        return (
                          <Card
                            key={i}
                            className="cursor-pointer hover-elevate transition-all"
                            onClick={() => setExpandedModule(isExpanded ? null : i)}
                            data-testid={`card-module-${i}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-md bg-primary/10 shrink-0">
                                  <IconComp className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-sm">{mod.name}</p>
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">Bu modulde yapabilecekleriniz:</p>
                                  {mod.detailedSteps && mod.detailedSteps.length > 0 ? (
                                    <ul className="space-y-1">
                                      {mod.detailedSteps.map((step, j) => (
                                        <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                                          <span className="text-primary font-bold shrink-0">-</span>
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(mod.path);
                                    }}
                                    data-testid={`button-go-module-${i}`}
                                  >
                                    Module Git
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                )}

                {guide.quickTips.length > 0 && (
                  <section data-testid="section-tips">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Hizli Ipuclari
                    </h2>
                    <Card>
                      <CardContent className="p-4">
                        <ul className="space-y-2">
                          {guide.quickTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-tip-${i}`}>
                              <span className="text-primary font-bold shrink-0">-</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </section>
                )}

                {guide.commonTasks.length > 0 && (
                  <section data-testid="section-tasks">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      Sik Yapilan Islemler
                    </h2>
                    <div className="space-y-2">
                      {guide.commonTasks.map((task, i) => (
                        <Card key={i} data-testid={`card-task-${i}`}>
                          <CardHeader
                            className="p-4 cursor-pointer flex flex-row items-center justify-between gap-2"
                            onClick={() => setExpandedTask(expandedTask === i ? null : i)}
                            data-testid={`button-expand-task-${i}`}
                          >
                            <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                            {expandedTask === i ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </CardHeader>
                          {expandedTask === i && (
                            <CardContent className="px-4 pb-4 pt-0">
                              <ol className="space-y-1">
                                {task.steps.map((step, j) => (
                                  <li key={j} className="flex items-start gap-2 text-sm" data-testid={`text-step-${i}-${j}`}>
                                    <Badge variant="outline" className="shrink-0 text-xs">{j + 1}</Badge>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {guide.restrictions.length > 0 && (
                  <section data-testid="section-restrictions">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5" />
                      Kisitlamalar
                    </h2>
                    <Card>
                      <CardContent className="p-4">
                        <ul className="space-y-2">
                          {guide.restrictions.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground" data-testid={`text-restriction-${i}`}>
                              <span className="shrink-0">-</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </section>
                )}

                <section data-testid="section-ai-ask">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI'ya Sor
                  </h2>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Sistem hakkinda sorularinizi Turkce olarak sorun, AI size rolunuze uygun yanitlar verecektir.
                      </p>
                      <Textarea
                        placeholder="Orn: Nasil yeni gorev olusturabilirim?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="resize-none"
                        rows={3}
                        data-testid="input-ai-question"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleAsk}
                          disabled={askMutation.isPending || !question.trim()}
                          data-testid="button-ask-ai"
                        >
                          {askMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Sor
                        </Button>
                      </div>
                      {aiAnswer && (
                        <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap" data-testid="text-ai-answer">
                          {aiAnswer}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>
              </>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground" data-testid="text-guide-error">Kullanim kilavuzu yuklenemedi.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="dokumanlar" className="space-y-4 mt-4">
            {selectedDoc ? (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDoc(null)}
                  data-testid="button-back-to-docs"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dokumanlara Don
                </Button>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle data-testid="text-doc-title">{selectedDoc.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" data-testid="badge-doc-category">
                          {CATEGORY_LABELS[selectedDoc.category] || selectedDoc.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent data-testid="section-doc-content">
                    <RenderMarkdown content={selectedDoc.content} />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Dokumanlarda ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-doc-search"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    data-testid="button-category-all"
                  >
                    Tumu
                  </Button>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <Button
                      key={key}
                      variant={selectedCategory === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                      data-testid={`button-category-${key}`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                {isDocsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : guideDocs.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground" data-testid="text-no-docs">Dokuman bulunamadi.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {guideDocs.map((doc) => (
                      <Card
                        key={doc.id}
                        className="cursor-pointer hover-elevate transition-all"
                        onClick={() => setSelectedDoc(doc)}
                        data-testid={`card-doc-${doc.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-md bg-primary/10 shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {CATEGORY_LABELS[doc.category] || doc.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {doc.content.slice(0, 120).replace(/[#*]/g, '')}...
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
