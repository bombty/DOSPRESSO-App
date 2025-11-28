import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, CheckCircle, Clock, Lightbulb } from "lucide-react";

export default function ModuleDetail() {
  const [, params] = useRoute("/akademi-modul/:id");
  const materialId = params?.id;

  const { data: material, isLoading } = useQuery({
    queryKey: [`/api/academy/module-content/${materialId}`],
    queryFn: async () => {
      if (!materialId) return null;
      const res = await fetch(`/api/academy/module-content/${materialId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!materialId,
  });

  if (isLoading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  if (!material) {
    return <div className="p-6 text-center text-destructive">Modül bulunamadı</div>;
  }

  const content = material.content || {};

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{material.title}</h1>
        <p className="text-muted-foreground mt-2">{material.description}</p>
        <Badge className="mt-3">{material.materialType}</Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BookOpen className="w-4 h-4 mr-1" />
            Genel
          </TabsTrigger>
          <TabsTrigger value="flashcards">
            <Clock className="w-4 h-4 mr-1" />
            Kartlar ({content.flashcards?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="quizzes">
            <CheckCircle className="w-4 h-4 mr-1" />
            Quizler ({content.quizzes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="guide">
            <Lightbulb className="w-4 h-4 mr-1" />
            Rehber
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Modül Genel Bilgi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Tür</p>
                <p className="font-medium">{material.materialType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durum</p>
                <Badge variant={material.status === 'published' ? 'default' : 'outline'}>
                  {material.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flashcards */}
        <TabsContent value="flashcards">
          <div className="space-y-3">
            {content.flashcards && content.flashcards.length > 0 ? (
              content.flashcards.map((card: any, idx: number) => (
                <Card key={idx}>
                  <CardContent className="pt-6 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Soru</p>
                      <p className="font-medium">{card.front}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cevap</p>
                      <p>{card.back}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">Flashcard yok</p>
            )}
          </div>
        </TabsContent>

        {/* Quizzes */}
        <TabsContent value="quizzes">
          <div className="space-y-3">
            {content.quizzes && content.quizzes.length > 0 ? (
              content.quizzes.map((quiz: any, idx: number) => (
                <Card key={idx}>
                  <CardContent className="pt-6 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Soru {idx + 1}</p>
                      <p className="font-medium">{quiz.question}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Seçenekler</p>
                      <ul className="list-disc list-inside space-y-1">
                        {quiz.options?.map((opt: string, i: number) => (
                          <li key={i}>{opt}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">Quiz yok</p>
            )}
          </div>
        </TabsContent>

        {/* Multi-Step Guide */}
        <TabsContent value="guide">
          <div className="space-y-3">
            {content.multiStepGuide?.steps && content.multiStepGuide.steps.length > 0 ? (
              content.multiStepGuide.steps.map((step: any, idx: number) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {step.title} ({step.timeEstimate})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p>{step.content}</p>
                    {step.tips && (
                      <div className="bg-muted p-3 rounded text-sm">
                        <p className="font-medium">İpuçları:</p>
                        <ul className="list-disc list-inside">
                          {step.tips.map((tip: string, i: number) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">Rehber yok</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
