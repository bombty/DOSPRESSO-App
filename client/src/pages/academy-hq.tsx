import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Clock, BookOpen, Users } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const quizSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  description: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const assignmentSchema = z.object({
  quizId: z.string().min(1, "Quiz seçin"),
  assignTo: z.enum(["user", "branch", "role"]),
  targetId: z.string().min(1, "Hedef seçin"),
});

export default function AcademyHQ() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Check HQ access
  if (!user || !isHQRole(user.role as any)) {
    return <div className="p-6 text-center text-destructive">Erişim Reddedildi</div>;
  }

  // Form hooks
  const quizForm = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: { title: "", description: "", difficulty: "medium" as const },
  });

  const assignForm = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { quizId: "", assignTo: "user" as const, targetId: "" },
  });

  // Get pending exam requests
  const { data: pendingExams = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests-pending"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-requests?status=pending`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get approved exams
  const { data: approvedExams = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests-approved"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-requests?status=approved`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Sınav onaylandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-approved"] });
      setSelectedExamId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({ title: "Sınav reddedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-pending"] });
      setSelectedExamId(null);
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: z.infer<typeof quizSchema>) => {
      return apiRequest("POST", "/api/academy/quiz/create", data);
    },
    onSuccess: () => {
      toast({ title: "Quiz oluşturuldu" });
      setIsCreateQuizOpen(false);
      quizForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/academy/quizzes"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const assignQuizMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentSchema>) => {
      return apiRequest("POST", "/api/academy/assignment/create", data);
    },
    onSuccess: () => {
      toast({ title: "Quiz atandı" });
      setIsAssignOpen(false);
      assignForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Get quizzes list
  const { data: quizzes = [] } = useQuery({
    queryKey: ["/api/academy/quizzes"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quizzes`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          size="icon"
          data-testid="button-back"
          title="Geri Dön"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Akademi - HQ Yönetim Paneli</h1>
        <p className="text-muted-foreground mt-2">Sınav talepleri, modül yönetimi ve kariyer onayları</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Beklemede ({pendingExams.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="w-4 h-4 mr-2" />
            Onaylı ({approvedExams.length})
          </TabsTrigger>
          <TabsTrigger value="quizzes">
            <BookOpen className="w-4 h-4 mr-2" />
            Quizler
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Users className="w-4 h-4 mr-2" />
            Atamalar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onay Bekleyen Sınav Talepleri</CardTitle>
              <CardDescription>Supervisor'lardan gelen sınav istekleri</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Beklemede talep yok</div>
              ) : (
                <div className="space-y-3">
                  {pendingExams.map((exam: any) => (
                    <div key={exam.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{exam.userId}</p>
                          <p className="text-sm text-muted-foreground">
                            Rol: {exam.targetRoleId} | Supervisor: {exam.supervisorId}
                          </p>
                        </div>
                        <Badge variant="outline">{exam.status}</Badge>
                      </div>

                      {exam.supervisorNotes && (
                        <div className="text-sm bg-muted p-3 rounded">
                          <p className="font-medium mb-1">Supervisor Notu:</p>
                          <p>{exam.supervisorNotes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="default" onClick={() => setSelectedExamId(exam.id)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Onayla
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sınav Onayı</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm">
                                <strong>{exam.userId}</strong> için <strong>{exam.targetRoleId}</strong> sınavını onaylamak istediğinize emin misiniz?
                              </p>
                              <div className="flex gap-2">
                                <Button 
                                  variant="default" 
                                  onClick={() => approveMutation.mutate(exam.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  Onayla
                                </Button>
                                <Button variant="outline">İptal</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive" onClick={() => setSelectedExamId(exam.id)}>
                              <XCircle className="w-4 h-4 mr-1" />
                              Reddet
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sınav Reddi</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea placeholder="Ret sebebi..." defaultValue="" id="reject-reason" />
                              <Button 
                                variant="destructive" 
                                onClick={() => {
                                  const reason = (document.getElementById("reject-reason") as HTMLTextAreaElement)?.value || "Belirtilmemiş";
                                  rejectMutation.mutate({ id: exam.id, reason });
                                }}
                              >
                                Reddet
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onaylanmış Sınavlar</CardTitle>
              <CardDescription>HQ tarafından onaylanan sınav istekleri</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Onaylı sınav yok</div>
              ) : (
                <div className="space-y-2">
                  {approvedExams.map((exam: any) => (
                    <div key={exam.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{exam.userId}</p>
                        <p className="text-xs text-muted-foreground">→ {exam.targetRoleId}</p>
                      </div>
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Onaylı
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Quiz Yönetimi</h3>
            <Dialog open={isCreateQuizOpen} onOpenChange={setIsCreateQuizOpen}>
              <DialogTrigger asChild>
                <Button>Yeni Quiz Oluştur</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Quiz Oluştur</DialogTitle>
                </DialogHeader>
                <Form {...quizForm}>
                  <form onSubmit={quizForm.handleSubmit((data) => createQuizMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={quizForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlık</FormLabel>
                          <FormControl>
                            <Input placeholder="Quiz başlığı" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quizForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Açıklama</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Quiz açıklaması" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quizForm.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zorluk</FormLabel>
                          <FormControl>
                            <select {...field} className="border rounded px-2 py-1">
                              <option value="easy">Kolay</option>
                              <option value="medium">Orta</option>
                              <option value="hard">Zor</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createQuizMutation.isPending}>
                      Oluştur
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {quizzes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Hiç quiz yok</div>
              ) : (
                <div className="space-y-2">
                  {quizzes.map((quiz: any) => (
                    <div key={quiz.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{quiz.title}</p>
                        <p className="text-sm text-muted-foreground">{quiz.description}</p>
                      </div>
                      <Badge variant="outline">{quiz.difficulty}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Quiz Atama</h3>
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
              <DialogTrigger asChild>
                <Button>Quiz Ata</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quiz Ata</DialogTitle>
                </DialogHeader>
                <Form {...assignForm}>
                  <form onSubmit={assignForm.handleSubmit((data) => assignQuizMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={assignForm.control}
                      name="quizId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quiz</FormLabel>
                          <FormControl>
                            <select {...field} className="border rounded px-2 py-1">
                              <option value="">Quiz seçin</option>
                              {quizzes.map((q: any) => (
                                <option key={q.id} value={q.id}>{q.title}</option>
                              ))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={assignForm.control}
                      name="assignTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kime Ata</FormLabel>
                          <FormControl>
                            <select {...field} className="border rounded px-2 py-1">
                              <option value="user">Kullanıcı</option>
                              <option value="branch">Şube</option>
                              <option value="role">Rol</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={assignForm.control}
                      name="targetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hedef</FormLabel>
                          <FormControl>
                            <Input placeholder="Kullanıcı/Şube/Rol ID'si" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={assignQuizMutation.isPending}>
                      Ata
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Sağ üstteki "Quiz Ata" butonuyla başla
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
