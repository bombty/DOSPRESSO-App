import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, HelpCircle, ListChecks, BarChart3 } from "lucide-react";

const quizSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  description: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const questionSchema = z.object({
  quizId: z.number().min(1),
  question: z.string().min(5, "Soru en az 5 karakter olmalı"),
  options: z.array(z.string()).min(2, "En az 2 seçenek gerekli"),
  correctAnswerIndex: z.number().min(0),
});

interface QuizItem {
  id: number;
  title_tr?: string;
  description_tr?: string;
  difficulty?: string;
  questionCount?: number;
}

export function QuizYonetimTab() {
  const { toast } = useToast();
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);

  const quizForm = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: { title: "", description: "", difficulty: "medium" as const },
  });

  const questionForm = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: { quizId: 1, question: "", options: ["", ""], correctAnswerIndex: 0 },
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ["/api/academy/quizzes"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quizzes`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: quizQuestions = [] } = useQuery({
    queryKey: ["/api/academy/quiz", selectedQuizId, "questions"],
    queryFn: async () => {
      if (!selectedQuizId) return [];
      const res = await fetch(`/api/academy/quiz/${selectedQuizId}/questions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedQuizId,
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: z.infer<typeof quizSchema>) => {
      return apiRequest("POST", "/api/academy/quizzes", data);
    },
    onSuccess: () => {
      toast({ title: "Quiz oluşturuldu" });
      setIsCreateQuizOpen(false);
      quizForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/academy/quizzes"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Quiz oluşturulamadı", variant: "destructive" });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof questionSchema>) => {
      return apiRequest("POST", "/api/academy/question", data);
    },
    onSuccess: () => {
      toast({ title: "Soru eklendi" });
      setIsAddQuestionOpen(false);
      questionForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/academy/quiz", selectedQuizId, "questions"] });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest("DELETE", `/api/academy/question/${questionId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Soru silindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/quiz", selectedQuizId, "questions"] });
    },
  });

  const difficultyLabel = (d?: string) => d === 'easy' ? 'Kolay' : d === 'hard' ? 'Zor' : 'Orta';

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-base sm:text-lg font-semibold">Quiz Yönetimi</h2>
        <Button size="sm" onClick={() => setIsCreateQuizOpen(true)} data-testid="button-create-quiz">
          <Plus className="w-3 h-3 mr-1" /> Yeni Quiz
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <ListChecks className="w-4 h-4" />
              Quizler ({quizzes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quizzes.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm" data-testid="text-no-quizzes">Henüz quiz oluşturulmadı</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                {(Array.isArray(quizzes) ? quizzes : []).map((quiz: QuizItem) => (
                  <div
                    key={quiz.id}
                    onClick={() => setSelectedQuizId(quiz.id)}
                    className={`p-3 border rounded text-sm cursor-pointer transition ${selectedQuizId === quiz.id ? 'border-primary bg-primary/5' : 'hover:border-border'}`}
                    data-testid={`quiz-item-${quiz.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{quiz.title_tr}</p>
                        {quiz.description_tr && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{quiz.description_tr}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">{difficultyLabel(quiz.difficulty)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <HelpCircle className="w-4 h-4" />
              {selectedQuizId ? `Sorular (${quizQuestions.length})` : "Quiz Seçin"}
            </CardTitle>
            {selectedQuizId && (
              <Button size="sm" variant="outline" onClick={() => { questionForm.setValue('quizId', selectedQuizId); setIsAddQuestionOpen(true); }} data-testid="button-add-question">
                <Plus className="w-3 h-3 mr-1" /> Soru Ekle
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedQuizId ? (
              <p className="text-center py-6 text-muted-foreground text-sm" data-testid="text-select-quiz">Sol taraftan bir quiz seçin</p>
            ) : quizQuestions.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm" data-testid="text-no-questions">Bu quiz'e henüz soru eklenmedi</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                {quizQuestions.map((q: any, idx: number) => (
                  <div key={q.id} className="p-2 border rounded text-xs" data-testid={`question-${q.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{idx + 1}. {q.question || q.questionText || q.question_tr}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(q.options || []).map((opt: string, j: number) => (
                            <Badge key={j} variant={j === q.correctAnswerIndex ? "default" : "outline"} className="text-xs">{opt}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteQuestionMutation.mutate(q.id)} data-testid={`button-delete-question-${q.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateQuizOpen} onOpenChange={setIsCreateQuizOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Quiz</DialogTitle></DialogHeader>
          <Form {...quizForm}>
            <form onSubmit={quizForm.handleSubmit((data) => createQuizMutation.mutate(data))} className="w-full space-y-3">
              <FormField control={quizForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Başlık</FormLabel><FormControl><Input {...field} placeholder="Quiz başlığı" data-testid="input-quiz-title" /></FormControl></FormItem>
              )} />
              <FormField control={quizForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Açıklama (İsteğe Bağlı)</FormLabel><FormControl><Textarea {...field} placeholder="Quiz açıklaması" data-testid="textarea-quiz-description" /></FormControl></FormItem>
              )} />
              <FormField control={quizForm.control} name="difficulty" render={({ field }) => (
                <FormItem>
                  <FormLabel>Zorluk</FormLabel>
                  <FormControl>
                    <select {...field} className="border rounded px-2 py-1 w-full bg-background" data-testid="select-difficulty">
                      <option value="easy">Kolay</option>
                      <option value="medium">Orta</option>
                      <option value="hard">Zor</option>
                    </select>
                  </FormControl>
                </FormItem>
              )} />
              <Button type="submit" disabled={createQuizMutation.isPending} className="w-full" data-testid="button-quiz-create">Oluştur</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Soru Ekle</DialogTitle></DialogHeader>
          <Form {...questionForm}>
            <form onSubmit={questionForm.handleSubmit((data) => createQuestionMutation.mutate(data))} className="w-full space-y-3">
              <FormField control={questionForm.control} name="question" render={({ field }) => (
                <FormItem><FormLabel>Soru</FormLabel><FormControl><Textarea {...field} placeholder="Soruyu yazın" data-testid="textarea-question" /></FormControl></FormItem>
              )} />
              <div className="space-y-2">
                <FormLabel>Seçenekler</FormLabel>
                {questionForm.watch("options").map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={questionForm.watch("correctAnswerIndex") === idx}
                      onChange={() => questionForm.setValue("correctAnswerIndex", idx)}
                      data-testid={`radio-correct-${idx}`}
                    />
                    <Input
                      value={questionForm.watch(`options.${idx}`)}
                      onChange={(e) => {
                        const opts = [...questionForm.getValues("options")];
                        opts[idx] = e.target.value;
                        questionForm.setValue("options", opts);
                      }}
                      placeholder={`Seçenek ${idx + 1}`}
                      data-testid={`input-option-${idx}`}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const opts = questionForm.getValues("options");
                  questionForm.setValue("options", [...opts, ""]);
                }} data-testid="button-add-option">
                  <Plus className="w-3 h-3 mr-1" /> Seçenek Ekle
                </Button>
              </div>
              <Button type="submit" disabled={createQuestionMutation.isPending} className="w-full" data-testid="button-question-create">Ekle</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
