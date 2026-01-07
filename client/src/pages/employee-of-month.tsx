import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, Medal, Star, Award, Users, TrendingUp, Calculator,
  Calendar, Building, Crown, Sparkles, Target, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const MONTHS = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"
];

const WEIGHT_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#ef4444"];

export default function EmployeeOfMonthPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
  });

  const { data: weights } = useQuery({
    queryKey: ["/api/employee-of-month/weights"],
  });

  const { data: rankings, isLoading } = useQuery({
    queryKey: ["/api/employee-of-month/rankings", selectedMonth, selectedYear, selectedBranchId],
  });

  const { data: awards } = useQuery({
    queryKey: ["/api/employee-of-month/awards", selectedYear],
  });

  const calculateMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/employee-of-month/calculate", {
      month: selectedMonth,
      year: selectedYear,
      branchId: selectedBranchId !== "all" ? parseInt(selectedBranchId) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-of-month/rankings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-of-month/awards"] });
      toast({ title: "Basarili", description: "Hesaplama tamamlandi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const weightData = weights ? [
    { name: "Devam", value: (weights as any).attendanceWeight, color: WEIGHT_COLORS[0] },
    { name: "Checklist", value: (weights as any).checklistWeight, color: WEIGHT_COLORS[1] },
    { name: "Gorevler", value: (weights as any).taskWeight, color: WEIGHT_COLORS[2] },
    { name: "Musteri", value: (weights as any).customerRatingWeight, color: WEIGHT_COLORS[3] },
    { name: "Yonetici", value: (weights as any).managerRatingWeight, color: WEIGHT_COLORS[4] },
    { name: "Izin Kesinti", value: (weights as any).leaveDeductionWeight, color: WEIGHT_COLORS[5] },
  ] : [];

  const topPerformers = (rankings as any[])?.slice(0, 3) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Ayin Elemani
          </h1>
          <p className="text-muted-foreground">
            Performans bazli ayin en iyi calisani secimi
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]" data-testid="select-month">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[160px]" data-testid="select-branch">
              <Building className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Tum subeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum Subeler</SelectItem>
              {(branches as any[])?.map((b: any) => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => calculateMutation.mutate()} 
            disabled={calculateMutation.isPending}
            data-testid="button-calculate"
          >
            {calculateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            Hesapla
          </Button>
        </div>
      </div>

      {/* Top 3 Winners */}
      {topPerformers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers.map((performer: any, index: number) => (
            <Card 
              key={performer.employeeId} 
              className={index === 0 ? "border-yellow-500 border-2 bg-yellow-50 dark:bg-yellow-950/20" : ""}
              data-testid={`card-winner-${index}`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className={`rounded-full p-3 mb-3 ${
                    index === 0 ? "bg-yellow-500 text-white" :
                    index === 1 ? "bg-gray-400 text-white" :
                    "bg-amber-700 text-white"
                  }`}>
                    {index === 0 ? <Crown className="h-8 w-8" /> :
                     index === 1 ? <Medal className="h-8 w-8" /> :
                     <Award className="h-8 w-8" />}
                  </div>
                  <Badge variant={index === 0 ? "default" : "secondary"} className="mb-2">
                    {index + 1}. Sirada
                  </Badge>
                  <h3 className="font-bold text-lg">
                    {performer.employee?.firstName} {performer.employee?.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{performer.branch?.name}</p>
                  <div className="mt-4 text-3xl font-bold text-primary">
                    {performer.totalScore?.toFixed(1)}
                  </div>
                  <p className="text-sm text-muted-foreground">Toplam Puan</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rankings" data-testid="tab-rankings">
            <TrendingUp className="mr-2 h-4 w-4" />
            Siralama
          </TabsTrigger>
          <TabsTrigger value="weights" data-testid="tab-weights">
            <Target className="mr-2 h-4 w-4" />
            Agirliklar
          </TabsTrigger>
          <TabsTrigger value="awards" data-testid="tab-awards">
            <Trophy className="mr-2 h-4 w-4" />
            Gecmis Oduller
          </TabsTrigger>
        </TabsList>

        {/* Rankings Tab */}
        <TabsContent value="rankings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {MONTHS[selectedMonth - 1]} {selectedYear} Siralaması
              </CardTitle>
              <CardDescription>
                Tum personelin performans puanlari ve detaylari
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (rankings as any[])?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Bu donem icin henuz hesaplama yapilmamis</p>
                  <p className="text-sm">Yukaridaki "Hesapla" butonuna tiklayin</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Personel</TableHead>
                      <TableHead>Sube</TableHead>
                      <TableHead className="text-center">Devam</TableHead>
                      <TableHead className="text-center">Checklist</TableHead>
                      <TableHead className="text-center">Gorev</TableHead>
                      <TableHead className="text-center">Musteri</TableHead>
                      <TableHead className="text-center">Yonetici</TableHead>
                      <TableHead className="text-center">Kesinti</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rankings as any[])?.map((r: any, index: number) => (
                      <TableRow key={r.employeeId} data-testid={`row-ranking-${r.employeeId}`}>
                        <TableCell>
                          {index < 3 ? (
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              {index + 1}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">{index + 1}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.employee?.firstName} {r.employee?.lastName}
                        </TableCell>
                        <TableCell>{r.branch?.name}</TableCell>
                        <TableCell className="text-center">
                          <ScoreCell value={r.attendanceScore} max={20} />
                        </TableCell>
                        <TableCell className="text-center">
                          <ScoreCell value={r.checklistScore} max={20} />
                        </TableCell>
                        <TableCell className="text-center">
                          <ScoreCell value={r.taskScore} max={15} />
                        </TableCell>
                        <TableCell className="text-center">
                          <ScoreCell value={r.customerRatingScore} max={15} />
                        </TableCell>
                        <TableCell className="text-center">
                          <ScoreCell value={r.managerRatingScore} max={20} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="text-xs">
                            -{r.leaveDeduction?.toFixed(1) || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-lg">
                            {r.totalScore?.toFixed(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weights Tab */}
        <TabsContent value="weights">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Puanlama Agirliklari</CardTitle>
                <CardDescription>Her kategorinin toplam puana etkisi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={weightData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: %${value}`}
                      >
                        {weightData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Kategori Detaylari</CardTitle>
                <CardDescription>Puanlama kriterleri aciklamasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {weightData.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="outline">%{item.value}</Badge>
                      </div>
                      <Progress value={item.value} className="h-2 mt-1" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Awards History Tab */}
        <TabsContent value="awards">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {selectedYear} Yili Ayin Elemanlari
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(awards as any[])?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Henuz odul verilmemis</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {MONTHS.map((monthName, monthIndex) => {
                    const award = (awards as any[])?.find(
                      (a: any) => a.month === monthIndex + 1 && a.year === selectedYear
                    );
                    return (
                      <Card 
                        key={monthIndex} 
                        className={award ? "border-yellow-500" : "opacity-50"}
                        data-testid={`card-award-${monthIndex}`}
                      >
                        <CardContent className="pt-4 text-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            {monthName}
                          </p>
                          {award ? (
                            <>
                              <Crown className="mx-auto h-6 w-6 text-yellow-500 my-2" />
                              <p className="font-bold text-sm">
                                {award.employee?.firstName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {award.totalScore?.toFixed(1)} puan
                              </p>
                            </>
                          ) : (
                            <div className="h-16 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">-</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreCell({ value, max }: { value: number; max: number }) {
  const percentage = (value / max) * 100;
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-medium">{value?.toFixed(1) || 0}</span>
      <Progress value={percentage} className="h-1 w-12 mt-1" />
    </div>
  );
}
