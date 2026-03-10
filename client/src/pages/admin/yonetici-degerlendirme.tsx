import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Star, UserCheck, CalendarDays, Save, AlertTriangle, CheckCircle, Briefcase, Users, Clock, MessageSquare, Rocket, Sparkles, Wrench, SmilePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  roleId: number;
  branchId: number;
}

interface ManagerEvaluation {
  id: number;
  employeeId: string;
  evaluatorId: string;
  branchId: number;
  month: string;
  customerService: number;
  teamwork: number;
  punctuality: number;
  communication: number;
  initiative: number;
  cleanliness: number;
  technicalSkill: number;
  attitude: number;
  overallScore: number;
  notes?: string;
  createdAt: string;
}

const evaluationCriteria = [
  { key: "customerService", label: "Müşteri Hizmetleri", Icon: Briefcase },
  { key: "teamwork", label: "Takım Çalışması", Icon: Users },
  { key: "punctuality", label: "Dakiklik", Icon: Clock },
  { key: "communication", label: "İletişim", Icon: MessageSquare },
  { key: "initiative", label: "İnisiyatif Alma", Icon: Rocket },
  { key: "cleanliness", label: "Temizlik/Düzen", Icon: Sparkles },
  { key: "technicalSkill", label: "Teknik Beceri", Icon: Wrench },
  { key: "attitude", label: "Tutum/Davranış", Icon: SmilePlus },
];

export default function YoneticiDegerlendirme() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [scores, setScores] = useState<Record<string, number>>({
    customerService: 3,
    teamwork: 3,
    punctuality: 3,
    communication: 3,
    initiative: 3,
    cleanliness: 3,
    technicalSkill: 3,
    attitude: 3,
  });
  const [notes, setNotes] = useState("");

  const { data: employees = [], isLoading: employeesLoading, isError, refetch } = useQuery<Employee[]>({
    queryKey: ["/api/users"],
  });

  const { data: evaluations = [], isLoading: evaluationsLoading } = useQuery<ManagerEvaluation[]>({
    queryKey: ["/api/manager-evaluations"],
  });

  const createEvaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/manager-evaluations", data);
    },
    onSuccess: () => {
      toast({ title: "Değerlendirme kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/manager-evaluations"] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Değerlendirme kaydedilemedi", 
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setSelectedEmployee("");
    setNotes("");
    setScores({
      customerService: 3,
      teamwork: 3,
      punctuality: 3,
      communication: 3,
      initiative: 3,
      cleanliness: 3,
      technicalSkill: 3,
      attitude: 3,
    });
  };

  const calculateOverall = () => {
    const values = Object.values(scores);
    
  if (employeesLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  if (values.length === 0) return "0.0";
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  const handleSubmit = () => {
    if (!selectedEmployee) {
      toast({ title: "Personel seçiniz", variant: "destructive" });
      return;
    }

    const overallScore = parseFloat(calculateOverall());
    
    createEvaluationMutation.mutate({
      employeeId: selectedEmployee,
      month: selectedMonth,
      ...scores,
      overallScore,
      notes,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-500";
    if (score >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return "Mükemmel";
    if (score >= 4) return "Çok İyi";
    if (score >= 3) return "İyi";
    if (score >= 2) return "Geliştirilmeli";
    return "Yetersiz";
  };

  const existingEvaluation = evaluations.find(
    (e) => e.employeeId === selectedEmployee && e.month === selectedMonth
  );

  const filteredEmployees = employees.filter(
    (e) => e.roleId && e.roleId >= 3 && e.roleId <= 7
  );

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toISOString().slice(0, 7);
  });

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>Aylık Personel Değerlendirmesi</CardTitle>
              <CardDescription>
                Personellerinizin performansını 8 kriterde 1-5 arası puanlayın
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Personel Seçimi</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger data-testid="select-employee">
                  <SelectValue placeholder="Personel seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Değerlendirme Ayı</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + "-01").toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {existingEvaluation && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-yellow-500">
                Bu personel için bu ay zaten değerlendirme yapılmış. 
                Yeni değerlendirme mevcut kaydın üzerine yazılacak.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {evaluationCriteria.map((criterion) => (
              <div key={criterion.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <criterion.Icon className="w-4 h-4 text-muted-foreground" />
                    {criterion.label}
                  </Label>
                  <Badge 
                    variant="outline" 
                    className={getScoreColor(scores[criterion.key])}
                  >
                    {scores[criterion.key]}/5
                  </Badge>
                </div>
                <Slider
                  value={[scores[criterion.key]]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={([value]) =>
                    setScores((prev) => ({ ...prev, [criterion.key]: value }))
                  }
                  className="w-full"
                  data-testid={`slider-${criterion.key}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Yetersiz</span>
                  <span>Geliştirilmeli</span>
                  <span>İyi</span>
                  <span>Çok İyi</span>
                  <span>Mükemmel</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Notlar (Opsiyonel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Değerlendirme hakkında ek notlar..."
              className="resize-none"
              rows={3}
              data-testid="input-notes"
            />
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Genel Puan</p>
                    <p className={`text-2xl font-bold ${getScoreColor(parseFloat(calculateOverall()))}`}>
                      {calculateOverall()}/5
                    </p>
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-lg px-4 py-2 ${getScoreColor(parseFloat(calculateOverall()))}`}
                >
                  {getScoreLabel(parseFloat(calculateOverall()))}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm} data-testid="button-reset">
              Sıfırla
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createEvaluationMutation.isPending || !selectedEmployee}
              data-testid="button-submit"
            >
              {createEvaluationMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Değerlendirmeyi Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Son Değerlendirmeler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evaluationsLoading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          ) : evaluations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Henüz değerlendirme yapılmamış
            </p>
          ) : (
            <div className="space-y-3">
              {evaluations.slice(0, 10).map((evaluation) => {
                const employee = employees.find((e) => e.id === evaluation.employeeId);
                return (
                  <div
                    key={evaluation.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`evaluation-item-${evaluation.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">
                          {employee
                            ? `${employee.firstName} ${employee.lastName}`
                            : "Bilinmiyor"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(evaluation.month + "-01").toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={getScoreColor(evaluation.overallScore)}
                    >
                      {evaluation.overallScore}/5 - {getScoreLabel(evaluation.overallScore)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
