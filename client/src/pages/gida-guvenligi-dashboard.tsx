import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  Thermometer,
  Droplets,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  Award,
  GraduationCap,
  Building2,
  TrendingUp,
  Clock,
  Activity,
  Beaker,
  Users,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardSummary {
  overview: {
    haccpControlPoints: number;
    haccpComplianceRate: number;
    recentDeviations: number;
    avgHygieneScore: number;
    totalAudits: number;
    activeCertifications: number;
    expiredCertifications: number;
    expiringCertifications: number;
    completedTrainings: number;
    scheduledTrainings: number;
    activeDocuments: number;
    totalBranches: number;
    totalSuppliers: number;
  };
  branchScores: Array<{ branchId: number; branchName: string; score: number; auditCount: number }>;
  categoryStats: Record<string, { total: number; deviations: number }>;
  recentDeviations: Array<{
    id: number;
    controlPointName: string;
    category: string;
    branchName: string;
    measuredValue: string;
    deviationNote: string;
    recordedAt: string;
  }>;
  expiringCertifications: Array<{
    id: number;
    supplierId: number;
    supplierName: string;
    certificationType: string;
    expiryDate: string;
  }>;
  upcomingTrainings: Array<{
    id: number;
    title: string;
    category: string;
    scheduledDate: string;
    status: string;
    branchId: number;
  }>;
}

interface HACCPControlPoint {
  id: number;
  controlPointName: string;
  category: string;
  criticalLimit: string;
  frequency: string;
  monitoringMethod: string;
  status: string;
}

interface HygieneAudit {
  id: number;
  branchId: number;
  branchName: string;
  auditorName: string;
  auditDate: string;
  overallScore: number;
  handHygieneScore: number;
  surfaceCleanlinessScore: number;
  equipmentHygieneScore: number;
  personalHygieneScore: number;
  wasteManagementScore: number;
  pestControlScore: number;
  storageConditionsScore: number;
  status: string;
  notes?: string;
}

interface SupplierCertification {
  id: number;
  supplierId: number;
  supplierName: string;
  certificationType: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  status: string;
}

interface FoodSafetyTraining {
  id: number;
  title: string;
  category: string;
  scheduledDate: string;
  completedDate?: string;
  status: string;
  trainerName?: string;
  participantCount?: number;
  branchId?: number;
  branchName?: string;
}

interface FoodSafetyDocument {
  id: number;
  title: string;
  category: string;
  version: string;
  effectiveDate: string;
  status: string;
  description?: string;
}

const categoryLabels: Record<string, string> = {
  sicaklik: "Sicaklik",
  hijyen: "Hijyen",
  su_kalitesi: "Su Kalitesi",
  depolama: "Depolama",
  pest_kontrol: "Pest Kontrol",
  kimyasal: "Kimyasal",
};

const scoreCategories: Array<{ key: keyof HygieneAudit; label: string }> = [
  { key: "handHygieneScore", label: "El Hijyeni" },
  { key: "surfaceCleanlinessScore", label: "Yuzey Temizligi" },
  { key: "equipmentHygieneScore", label: "Ekipman Hijyeni" },
  { key: "personalHygieneScore", label: "Kisisel Hijyen" },
  { key: "wasteManagementScore", label: "Atik Yonetimi" },
  { key: "pestControlScore", label: "Haşere Kontrolu" },
  { key: "storageConditionsScore", label: "Depolama Kosullari" },
];

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
}

function getCertStatusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "active") return "default";
  if (status === "expiring_soon") return "secondary";
  return "destructive";
}

function getCertStatusLabel(status: string): string {
  if (status === "active") return "Aktif";
  if (status === "expiring_soon") return "Suresi Yaklasan";
  return "Suresi Dolmus";
}

function getTrainingStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "scheduled") return "secondary";
  if (status === "cancelled") return "destructive";
  return "outline";
}

function getTrainingStatusLabel(status: string): string {
  if (status === "completed") return "Tamamlandi";
  if (status === "scheduled") return "Planli";
  if (status === "cancelled") return "Iptal";
  return status;
}

export default function GidaGuvenligiDashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/food-safety/dashboard-summary"],
  });

  const { data: controlPoints = [], isLoading: controlPointsLoading } = useQuery<HACCPControlPoint[]>({
    queryKey: ["/api/food-safety/haccp-control-points"],
  });

  const { data: audits = [], isLoading: auditsLoading } = useQuery<HygieneAudit[]>({
    queryKey: ["/api/food-safety/hygiene-audits"],
  });

  const { data: certifications = [], isLoading: certificationsLoading } = useQuery<SupplierCertification[]>({
    queryKey: ["/api/food-safety/supplier-certifications"],
  });

  const { data: trainings = [], isLoading: trainingsLoading } = useQuery<FoodSafetyTraining[]>({
    queryKey: ["/api/food-safety/trainings"],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<FoodSafetyDocument[]>({
    queryKey: ["/api/food-safety/documents"],
  });

  if (summaryLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const overview = summary?.overview;
  const branchScores = summary?.branchScores || [];
  const recentDeviations = summary?.recentDeviations || [];
  const expiringCerts = summary?.expiringCertifications || [];

  const groupedControlPoints = controlPoints.reduce<Record<string, HACCPControlPoint[]>>((acc, cp) => {
    const cat = cp.category || "diger";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cp);
    return acc;
  }, {});

  const scheduledTrainings = trainings.filter((t) => t.status === "scheduled");
  const completedTrainings = trainings.filter((t) => t.status === "completed");
  const cancelledTrainings = trainings.filter((t) => t.status === "cancelled");

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-dashboard-title">
            <ShieldCheck className="h-5 w-5" />
            Gida Guvenligi Paneli
          </h1>
          <p className="text-sm text-muted-foreground">
            HACCP, hijyen denetimleri ve sertifika takibi
          </p>
        </div>
        <Badge variant="outline" className="text-xs px-2 py-1">
          <Calendar className="h-3 w-3 mr-1" />
          {format(new Date(), "d MMMM yyyy", { locale: tr })}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap" data-testid="tabs-navigation">
          <TabsTrigger value="overview" data-testid="tab-overview">
            Genel Bakis
          </TabsTrigger>
          <TabsTrigger value="haccp" data-testid="tab-haccp">
            HACCP Kontrol
          </TabsTrigger>
          <TabsTrigger value="hygiene" data-testid="tab-hygiene">
            Hijyen Denetimleri
          </TabsTrigger>
          <TabsTrigger value="certifications" data-testid="tab-certifications">
            Sertifikalar
          </TabsTrigger>
          <TabsTrigger value="trainings" data-testid="tab-trainings">
            Egitimler
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            Dokumanlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card data-testid="card-haccp-compliance">
              <CardContent className="pt-4 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold" data-testid="text-haccp-rate">
                      %{overview?.haccpComplianceRate ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">HACCP Uygunluk Orani</p>
                  </div>
                </div>
                <Progress value={overview?.haccpComplianceRate ?? 0} className="mt-3 h-1.5" />
              </CardContent>
            </Card>

            <Card data-testid="card-hygiene-score">
              <CardContent className="pt-4 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Droplets className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold" data-testid="text-hygiene-score">
                      {overview?.avgHygieneScore ?? 0}/100
                    </p>
                    <p className="text-xs text-muted-foreground">Hijyen Skoru</p>
                  </div>
                </div>
                <Progress value={overview?.avgHygieneScore ?? 0} className="mt-3 h-1.5" />
              </CardContent>
            </Card>

            <Card data-testid="card-active-certs">
              <CardContent className="pt-4 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Award className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold" data-testid="text-active-certs">
                      {overview?.activeCertifications ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Aktif Sertifika</p>
                  </div>
                </div>
                {(overview?.expiringCertifications ?? 0) > 0 && (
                  <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {overview?.expiringCertifications} sertifikanin suresi yaklasıyor
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-deviations">
              <CardContent className="pt-4 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold" data-testid="text-deviations">
                      {overview?.recentDeviations ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Son 7 Gun Sapma</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-scheduled-trainings">
              <CardContent className="pt-4 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <GraduationCap className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold" data-testid="text-scheduled-trainings">
                      {overview?.scheduledTrainings ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Planli Egitim</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-active-documents">
              <CardContent className="pt-4 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-teal-100 dark:bg-teal-900/30">
                    <FileText className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold" data-testid="text-active-docs">
                      {overview?.activeDocuments ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Aktif Dokuman</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {branchScores.length > 0 && (
            <Card data-testid="chart-branch-hygiene">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Sube Hijyen Skorlari
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={branchScores}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="branchName"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: "12px" }}
                      formatter={(value: number) => [`${value}/100`, "Skor"]}
                    />
                    <Bar
                      dataKey="score"
                      fill="hsl(var(--primary))"
                      name="Hijyen Skoru"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-recent-deviations">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Son Sapmalar
                </CardTitle>
                <Badge variant="destructive" className="text-xs">
                  {recentDeviations.length}
                </Badge>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {recentDeviations.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-50" />
                    <p className="text-sm text-muted-foreground">Sapma bulunmuyor</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2 pr-4">
                      {recentDeviations.map((dev) => (
                        <div
                          key={dev.id}
                          className="p-3 rounded-lg bg-muted/50 space-y-1"
                          data-testid={`deviation-item-${dev.id}`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-medium">{dev.controlPointName}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {categoryLabels[dev.category] || dev.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {dev.branchName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Olculen: {dev.measuredValue}
                            </span>
                          </div>
                          {dev.deviationNote && (
                            <p className="text-[11px] text-muted-foreground">{dev.deviationNote}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {format(parseISO(dev.recordedAt), "d MMM yyyy HH:mm", { locale: tr })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-expiring-certs">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Suresi Yaklasan Sertifikalar
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {expiringCerts.length}
                </Badge>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {expiringCerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-50" />
                    <p className="text-sm text-muted-foreground">Suresi yaklasan sertifika yok</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2 pr-4">
                      {expiringCerts.map((cert) => {
                        const expiry = cert.expiryDate ? parseISO(cert.expiryDate) : new Date();
                        const daysLeft = differenceInDays(expiry, new Date());
                        return (
                          <div
                            key={cert.id}
                            className="p-3 rounded-lg bg-muted/50 space-y-1"
                            data-testid={`expiring-cert-${cert.id}`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-medium">{cert.supplierName}</span>
                              <Badge
                                variant={daysLeft <= 7 ? "destructive" : "secondary"}
                                className="text-[10px]"
                              >
                                {daysLeft <= 0 ? "Suresi doldu" : `${daysLeft} gun kaldi`}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {cert.certificationType}
                            </p>
                            {cert.expiryDate && (
                              <p className="text-[10px] text-muted-foreground">
                                Son tarih: {format(expiry, "d MMM yyyy", { locale: tr })}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="haccp" className="space-y-4 mt-4">
          {controlPointsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : Object.keys(groupedControlPoints).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">HACCP kontrol noktasi bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedControlPoints).map(([category, points]) => (
              <Card key={category} data-testid={`haccp-category-${category}`}>
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {category === "sicaklik" && <Thermometer className="h-4 w-4" />}
                    {category === "hijyen" && <Droplets className="h-4 w-4" />}
                    {category === "su_kalitesi" && <Beaker className="h-4 w-4" />}
                    {!["sicaklik", "hijyen", "su_kalitesi"].includes(category) && (
                      <ClipboardCheck className="h-4 w-4" />
                    )}
                    {categoryLabels[category] || category}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {points.length} kontrol noktasi
                  </Badge>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {points.map((cp) => (
                      <div
                        key={cp.id}
                        className="p-3 rounded-lg bg-muted/50 flex items-start justify-between gap-3 flex-wrap"
                        data-testid={`haccp-point-${cp.id}`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-medium">{cp.controlPointName}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                            <span>Kritik Limit: {cp.criticalLimit}</span>
                            <span>Frekans: {cp.frequency}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Izleme: {cp.monitoringMethod}
                          </p>
                        </div>
                        <Badge
                          variant={cp.status === "active" ? "default" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {cp.status === "active" ? "Aktif" : cp.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="hygiene" className="space-y-4 mt-4">
          {auditsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : audits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Droplets className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Hijyen denetimi bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            audits.map((audit) => (
              <Card key={audit.id} data-testid={`audit-card-${audit.id}`}>
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {audit.branchName}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Denetci: {audit.auditorName} - {format(parseISO(audit.auditDate), "d MMM yyyy", { locale: tr })}
                    </p>
                  </div>
                  <Badge variant={getScoreBadgeVariant(audit.overallScore)} className="text-xs">
                    Genel: {audit.overallScore}/100
                  </Badge>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {scoreCategories.map(({ key, label }) => {
                      const score = audit[key] as number;
                      return (
                        <div key={key} className="p-2 rounded-lg bg-muted/50 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                          <p className={`text-sm font-bold ${getScoreColor(score)}`}>{score}</p>
                          <Progress value={score} className="h-1 mt-1" />
                        </div>
                      );
                    })}
                  </div>
                  {audit.notes && (
                    <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/30 rounded-lg">
                      {audit.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="certifications" className="space-y-4 mt-4">
          {certificationsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : certifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Sertifika bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {certifications.map((cert) => {
                const expiryDate = cert.expiryDate ? parseISO(cert.expiryDate) : new Date();
                const daysLeft = differenceInDays(expiryDate, new Date());
                return (
                  <Card key={cert.id} data-testid={`cert-card-${cert.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium">{cert.supplierName}</p>
                          <p className="text-xs text-muted-foreground">{cert.certificationType}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                            <span>No: {cert.certificateNumber}</span>
                            {cert.issueDate && (
                              <span>
                                Baslangic: {format(parseISO(cert.issueDate), "d MMM yyyy", { locale: tr })}
                              </span>
                            )}
                            {cert.expiryDate && (
                              <span>
                                Bitis: {format(expiryDate, "d MMM yyyy", { locale: tr })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={getCertStatusVariant(cert.status)} className="text-xs">
                            {getCertStatusLabel(cert.status)}
                          </Badge>
                          <span className={`text-[11px] font-medium ${daysLeft <= 30 ? "text-red-600" : daysLeft <= 90 ? "text-yellow-600" : "text-green-600"}`}>
                            {daysLeft <= 0 ? "Suresi doldu" : `${daysLeft} gun kaldi`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trainings" className="space-y-4 mt-4">
          {trainingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : trainings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Egitim bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {scheduledTrainings.length > 0 && (
                <Card data-testid="card-scheduled-trainings-list">
                  <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Planli Egitimler
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {scheduledTrainings.length}
                    </Badge>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {scheduledTrainings.map((training) => (
                        <div
                          key={training.id}
                          className="p-3 rounded-lg bg-muted/50 flex items-start justify-between gap-3 flex-wrap"
                          data-testid={`training-item-${training.id}`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs font-medium">{training.title}</p>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(training.scheduledDate), "d MMM yyyy", { locale: tr })}
                              </span>
                              {training.trainerName && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {training.trainerName}
                                </span>
                              )}
                              {training.branchName && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {training.branchName}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            Planli
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {completedTrainings.length > 0 && (
                <Card data-testid="card-completed-trainings-list">
                  <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Tamamlanan Egitimler
                    </CardTitle>
                    <Badge variant="default" className="text-xs">
                      {completedTrainings.length}
                    </Badge>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {completedTrainings.map((training) => (
                        <div
                          key={training.id}
                          className="p-3 rounded-lg bg-muted/50 flex items-start justify-between gap-3 flex-wrap"
                          data-testid={`training-item-${training.id}`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs font-medium">{training.title}</p>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(training.completedDate || training.scheduledDate), "d MMM yyyy", { locale: tr })}
                              </span>
                              {training.participantCount && (
                                <span>{training.participantCount} katilimci</span>
                              )}
                            </div>
                          </div>
                          <Badge variant="default" className="text-[10px] shrink-0">
                            Tamamlandi
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {cancelledTrainings.length > 0 && (
                <Card data-testid="card-cancelled-trainings-list">
                  <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Iptal Edilen Egitimler
                    </CardTitle>
                    <Badge variant="destructive" className="text-xs">
                      {cancelledTrainings.length}
                    </Badge>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {cancelledTrainings.map((training) => (
                        <div
                          key={training.id}
                          className="p-3 rounded-lg bg-muted/50 flex items-start justify-between gap-3 flex-wrap"
                          data-testid={`training-item-${training.id}`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs font-medium">{training.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {format(parseISO(training.scheduledDate), "d MMM yyyy", { locale: tr })}
                            </p>
                          </div>
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            Iptal
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-4">
          {documentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Dokuman bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Card key={doc.id} data-testid={`document-card-${doc.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {doc.title}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {doc.category}
                          </Badge>
                          <span>Versiyon: {doc.version}</span>
                          <span>
                            Yururluk: {format(parseISO(doc.effectiveDate), "d MMM yyyy", { locale: tr })}
                          </span>
                        </div>
                        {doc.description && (
                          <p className="text-[11px] text-muted-foreground">{doc.description}</p>
                        )}
                      </div>
                      <Badge
                        variant={doc.status === "active" ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {doc.status === "active" ? "Aktif" : doc.status === "draft" ? "Taslak" : doc.status === "archived" ? "Arsiv" : doc.status}
                      </Badge>
                    </div>
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
