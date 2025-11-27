import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  Clock,
  CheckCircle,
  Award,
  BookOpen,
  FileText,
  Play,
} from "lucide-react";

export default function EgitimDetay() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const { data: module, isLoading } = useQuery<any>({
    queryKey: ["/api/training/modules", id],
    queryFn: async () => {
      const response = await fetch(`/api/training/modules/${id}`);
      if (!response.ok) throw new Error("Failed to fetch module");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: progress } = useQuery<any[]>({
    queryKey: ["/api/training/progress", "module", id],
    queryFn: async () => {
      const response = await fetch(`/api/training/progress?moduleId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Eğitim modülü bulunamadı</p>
            <Link href="/egitim">
              <Button className="mt-4">Geri Dön</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = progress?.filter((p) => p.status === "completed").length || 0;
  const inProgressCount = progress?.filter((p) => p.status === "in_progress").length || 0;
  const notStartedCount = progress?.filter((p) => p.status === "not_started").length || 0;

  const getUserById = (userId: string) => users?.find((u) => u.id === userId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            data-testid="button-back"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{module.title}</h1>
            <p className="text-muted-foreground mt-1">Eğitim Modülü Detayı</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kayıtlı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Personel</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tamamlayan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Personel</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Devam Eden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Personel</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Başlamamış</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{notStartedCount}</div>
            <p className="text-xs text-muted-foreground">Personel</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Modül Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Kategori</p>
              <Badge variant="outline" className="mt-1">
                {module.category || "Genel"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seviye</p>
              <Badge variant={module.level === "advanced" ? "destructive" : "default"} className="mt-1">
                {module.level === "beginner" ? "Başlangıç" : module.level === "intermediate" ? "Orta" : "İleri"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Süre</p>
              <p className="font-medium mt-1 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {module.durationMinutes || 60} dk
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zorunlu</p>
              <Badge variant={module.isRequired ? "default" : "outline"} className="mt-1">
                {module.isRequired ? "Evet" : "Hayır"}
              </Badge>
            </div>
          </div>
          {module.description && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Açıklama</p>
              <p className="text-sm">{module.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="participants" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="participants" className="text-xs px-3 py-1.5">
            <Users className="h-3 w-3 mr-1" />
            Katılımcılar
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs px-3 py-1.5">
            <BookOpen className="h-3 w-3 mr-1" />
            İçerik
          </TabsTrigger>
          <TabsTrigger value="certificates" className="text-xs px-3 py-1.5">
            <Award className="h-3 w-3 mr-1" />
            Sertifikalar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kayıtlı Personeller</CardTitle>
              <CardDescription>Bu eğitim modülüne kayıtlı personeller ve ilerlemeleri</CardDescription>
            </CardHeader>
            <CardContent>
              {progress && progress.length > 0 ? (
                <div className="space-y-3">
                  {progress.map((p: any) => {
                    const user = getUserById(p.userId);
                    return (
                      <Link key={p.id} href={`/personel-detay/${p.userId}`}>
                        <div
                          className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                          data-testid={`participant-${p.userId}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-blue-600 hover:underline">
                              {user?.firstName || "Bilinmeyen"} {user?.lastName || ""}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Progress value={p.progress || 0} className="flex-1 h-2" />
                              <span className="text-sm font-medium">{p.progress || 0}%</span>
                            </div>
                          </div>
                          <Badge
                            variant={p.status === "completed" ? "outline" : "default"}
                            className={p.status === "completed" ? "bg-green-50 text-green-700 ml-3" : "ml-3"}
                          >
                            {p.status === "completed"
                              ? "Tamamlandı"
                              : p.status === "in_progress"
                              ? "Devam Ediyor"
                              : "Başlamadı"}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz kayıtlı personel bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eğitim İçeriği</CardTitle>
              <CardDescription>Modül içeriği ve materyaller</CardDescription>
            </CardHeader>
            <CardContent>
              {module.content ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: module.content }} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Play className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Video Eğitimi</p>
                      <p className="text-sm text-muted-foreground">30 dakika</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Eğitim Dokümanları</p>
                      <p className="text-sm text-muted-foreground">PDF formatında</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Quiz Değerlendirmesi</p>
                      <p className="text-sm text-muted-foreground">10 soru</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verilen Sertifikalar</CardTitle>
              <CardDescription>Bu modülü tamamlayanlara verilen sertifikalar</CardDescription>
            </CardHeader>
            <CardContent>
              {progress?.filter((p) => p.status === "completed").length > 0 ? (
                <div className="space-y-3">
                  {progress
                    .filter((p) => p.status === "completed")
                    .map((p: any) => {
                      const user = getUserById(p.userId);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20"
                          data-testid={`certificate-${p.userId}`}
                        >
                          <div className="flex items-center gap-3">
                            <Award className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">
                                {user?.firstName || "Bilinmeyen"} {user?.lastName || ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Tamamlanma: {p.completedAt ? new Date(p.completedAt).toLocaleDateString("tr-TR") : "-"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sertifikalı
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz sertifika verilmemiş</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
