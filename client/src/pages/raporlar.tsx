import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus } from "lucide-react";

interface DetailedReport {
  id: number;
  title: string;
  reportType: string;
  branchIds: number[];
  dateRange: { start: string; end: string };
  metrics: string[];
  chartType?: string;
  includeAISummary?: boolean;
  createdAt: string;
  createdById: string;
}

export default function Raporlar() {
  const [selectedTab, setSelectedTab] = useState("comparison");

  // Fetch reports
  const { data: reports = [], isLoading } = useQuery<DetailedReport[]>({
    queryKey: ["/api/detailed-reports"],
  });

  // Sample data for branch comparison
  const comparisonData = [
    { branch: "Şube 1", faults: 5, tasks: 12, equipment: 45, health: 85 },
    { branch: "Şube 2", faults: 3, tasks: 8, equipment: 38, health: 92 },
    { branch: "Şube 3", faults: 7, tasks: 15, equipment: 52, health: 78 },
  ];

  // Sample data for trends
  const trendData = [
    { date: "01 Ara", faults: 5, tasks: 12 },
    { date: "02 Ara", faults: 4, tasks: 11 },
    { date: "03 Ara", faults: 6, tasks: 14 },
    { date: "04 Ara", faults: 3, tasks: 10 },
    { date: "05 Ara", faults: 8, tasks: 16 },
    { date: "06 Ara", faults: 5, tasks: 13 },
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Raporlar</h1>
          <p className="text-muted-foreground">Şube performansı ve analitik raporları</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Rapor
        </Button>
      </div>

      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">Şube Karşılaştırması</TabsTrigger>
          <TabsTrigger value="trends">Trend Analizi</TabsTrigger>
          <TabsTrigger value="list">Raporlar</TabsTrigger>
        </TabsList>

        {/* Şube Karşılaştırması */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Şube Performans Karşılaştırması</CardTitle>
              <CardDescription>Şubeler arası metrik karşılaştırması</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branch" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="faults" fill="#ef4444" name="Arızalar" />
                  <Bar dataKey="tasks" fill="#3b82f6" name="Görevler" />
                  <Bar dataKey="health" fill="#10b981" name="Sağlık Puanı" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Analizi */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analizi</CardTitle>
              <CardDescription>Son 6 günün arıza ve görev trendi</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="faults" stroke="#ef4444" name="Arızalar" />
                  <Line type="monotone" dataKey="tasks" stroke="#3b82f6" name="Görevler" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raporlar Listesi */}
        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Raporlar yükleniyor...
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Henüz rapor oluşturulmamış. Yeni rapor oluşturmak için butona tıklayın.
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <CardTitle>{report.title}</CardTitle>
                  <CardDescription>
                    {report.reportType} • {new Date(report.createdAt).toLocaleDateString('tr-TR')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Dönem</p>
                      <p className="font-semibold">
                        {report.dateRange?.start} - {report.dateRange?.end}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Şubeler</p>
                      <p className="font-semibold">{report.branchIds?.length || 0} şube</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
