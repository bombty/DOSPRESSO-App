import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, BookOpen } from "lucide-react";

interface QAResponse {
  answer: string;
  sources: Array<{
    articleId: number;
    title: string;
    relevantChunk: string;
  }>;
  noKnowledgeFound?: boolean;
}

export default function AIAssistant() {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<Array<{
    question: string;
    answer: string;
    sources: QAResponse['sources'];
    noKnowledgeFound: boolean;
  }>>([]);

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await apiRequest("POST", "/api/knowledge-base/ask", { question: q });
      const data = await response.json() as QAResponse;
      console.log("[AI Assistant] Response received:", data);
      return data;
    },
    onSuccess: (data: QAResponse) => {
      console.log("[AI Assistant] onSuccess called with data:", data);
      setConversation(prev => [...prev, {
        question,
        answer: data.answer,
        sources: data.sources || [],
        noKnowledgeFound: data.noKnowledgeFound || false,
      }]);
      setQuestion("");
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Soru cevaplanamadı",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      askMutation.mutate(question);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">AI Asistan</h1>
        <p className="text-muted-foreground mt-1">Bilgi bankasından soru sorun ve anında cevap alın</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Sohbet
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6">
          {conversation.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz soru sorulmadı.</p>
              <p className="text-sm mt-2">Aşağıdaki alandan bir soru sorun.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {conversation.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    S
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-muted-foreground mb-1">Siz sordunuz:</p>
                    <p className="text-foreground">{item.question}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm">
                    AI
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-muted-foreground mb-2">AI Cevabı:</p>
                    {item.noKnowledgeFound && (
                      <Badge variant="outline" className="mb-2 bg-yellow-50 text-yellow-800 border-yellow-300">
                        Bilgi bulunamadı
                      </Badge>
                    )}
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground whitespace-pre-wrap">{item.answer}</p>
                    </div>
                    
                    {item.sources?.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Kaynaklar:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {item.sources.map((source, idx) => (
                            <div key={idx} className="text-sm">
                              <Badge variant="outline" className="mb-1">
                                {source.title}
                              </Badge>
                              <p className="text-muted-foreground text-xs ml-1">
                                {source.relevantChunk}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {index < conversation.length - 1 && <div className="border-b" />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Sorunuzu buraya yazın... (örn: Espresso makinesi nasıl kalibre edilir?)"
              className="min-h-[100px]"
              disabled={askMutation.isPending}
              data-testid="input-question"
            />
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!question.trim() || askMutation.isPending}
                data-testid="button-ask"
              >
                {askMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cevap bekleniyor...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Sor
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
