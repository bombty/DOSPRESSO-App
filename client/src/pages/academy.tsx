import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExamRequestSchema, type ExamRequest } from "@shared/schema";
import { Award, TrendingUp, BookOpen, Plus, Zap } from "lucide-react";

const CAREER_LEVELS = [
  { id: 1, roleId: "stajyer", titleTr: "Stajyer", levelNumber: 1 },
  { id: 2, roleId: "bar_buddy", titleTr: "Bar Buddy", levelNumber: 2 },
  { id: 3, roleId: "barista", titleTr: "Barista", levelNumber: 3 },
  { id: 4, roleId: "supervisor_buddy", titleTr: "Supervisor Buddy", levelNumber: 4 },
  { id: 5, roleId: "supervisor", titleTr: "Supervisor", levelNumber: 5 },
];

export default function Academy() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false);

  // Get career levels
  const { data: careerLevels = [] } = useQuery({
    queryKey: ["/api/academy/career-levels"],
    queryFn: async () => {
      const res = await fetch("/api/academy/career-levels", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get user career progress
  const { data: userProgress } = useQuery({
    queryKey: ["/api/academy/career-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/academy/career-progress/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Get exam requests for supervisor view
  const { data: examRequests = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests", user?.id],
    queryFn: async () => {
      if (user?.role !== "supervisor") return [];
      const res = await fetch(`/api/academy/exam-requests?status=pending`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.role === "supervisor",
  });

  // Exam request form
  const form = useForm({
    resolver: zodResolver(insertExamRequestSchema),
    defaultValues: {
      userId: "",
      targetRoleId: "bar_buddy",
      supervisorId: user?.id || "",
      supervisorNotes: "",
      status: "pending",
    },
  });

  const createExamMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/academy/exam-request", data);
    },
    onSuccess: () => {
      toast({ title: "Sınav talep gönderildi", description: "HQ tarafından incelenecek" });
      setIsExamDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Current level display
  const currentLevel = CAREER_LEVELS.find(l => l.roleId === user?.role);
  const nextLevel = currentLevel ? CAREER_LEVELS[currentLevel.levelNumber] : null;
  const progressPercent = userProgress?.averageQuizScore || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DOSPRESSO Academy</h1>
        <p className="text-muted-foreground mt-2">Kariyer yolunuzu takip edin ve ilerleyin</p>
      </div>

      {/* My Path Section */}
      {currentLevel && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Benim Yolum
                </CardTitle>
                <CardDescription>Kariyer ilerlemesi ve sonraki hedefler</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Level */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Mevcut Seviye</span>
                <Badge variant="default">{currentLevel.titleTr}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Seviye {currentLevel.levelNumber}/5</p>
            </div>

            {/* Progress to Next Level */}
            {nextLevel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sonraki Seviyeye İlerleme</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">Hedef: {nextLevel.titleTr}</p>
              </div>
            )}

            {/* Career Path */}
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Kariyer Yolu</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {CAREER_LEVELS.map((level, idx) => (
                  <div key={level.id} className="flex items-center gap-2">
                    <Badge 
                      variant={level.levelNumber <= currentLevel.levelNumber ? "default" : "outline"}
                      className="whitespace-nowrap"
                    >
                      {level.titleTr}
                    </Badge>
                    {idx < CAREER_LEVELS.length - 1 && <span className="text-muted-foreground">→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Next Module */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">Sonraki Modül</span>
                </div>
                {nextLevel && user?.role === "supervisor" && (
                  <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="w-3 h-3 mr-1" />
                        Sınav Talep Et
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Sınav Talep Formu</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit((data) => createExamMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="userId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Çalışan ID</FormLabel>
                                <FormControl>
                                  <input {...field} type="text" placeholder="user-id" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="targetRoleId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hedef Rol</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {CAREER_LEVELS.slice(1).map(level => (
                                      <SelectItem key={level.roleId} value={level.roleId}>
                                        {level.titleTr}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="supervisorNotes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notlar</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Sınav hakkında notlarınız..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={createExamMutation.isPending} className="w-full">
                            {createExamMutation.isPending ? "Gönderiliyor..." : "Talep Gönder"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Modül içeriği yakında yüklenecek</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Exam Requests for Supervisors */}
      {user?.role === "supervisor" && examRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Beklemede Olan Sınav Talepleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {examRequests.map((req: ExamRequest) => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{req.userId}</p>
                    <p className="text-xs text-muted-foreground">→ {req.targetRoleId}</p>
                  </div>
                  <Badge variant="outline">{req.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
