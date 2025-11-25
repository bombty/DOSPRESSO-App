import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, Users, CheckCircle2, Clock, Wrench, TrendingUp, 
  Star, Award, ClipboardCheck, ThumbsUp 
} from "lucide-react";

type Branch = {
  id: number;
  name: string;
  address: string;
  city: string;
  phoneNumber: string;
  managerName: string;
};

type User = {
  id: string;
  username: string;
  fullName: string;
  role: string;
  branchId: number | null;
  hireDate: string | null;
  isActive: boolean;
  performanceScore?: number;
};

type BranchDetails = {
  branch: Branch;
  scores: {
    employeePerformanceScore: number;
    equipmentScore: number;
    qualityAuditScore: number;
    customerSatisfactionScore: number;
    compositeScore: number;
  };
  staff: User[];
  equipment: any[];
  recentTasks: any[];
  recentFaults: any[];
  recentFeedback: any[];
  recentComplaints: any[];
};

export default function SubeDetayPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const branchId = parseInt(id || "0");

  // Authorization: Supervisor can only view their own branch
  if (user?.role === 'supervisor' && user?.branchId !== branchId) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-lg text-muted-foreground">Bu şubeye erişim yetkiniz yok</p>
        <Link href="/subeler">
          <Button variant="default">Şubelere Dön</Button>
        </Link>
      </div>
    );
  }

  // Fetch comprehensive branch details with scores and staff
  const { data: branchData, isLoading: branchLoading } = useQuery<BranchDetails>({
    queryKey: [`/api/branches/${branchId}/detail`],
    enabled: !!branchId,
  });

  if (branchLoading) {
    return <div className="flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  if (!branchData) {
    return <div className="flex items-center justify-center h-full">Şube bulunamadı</div>;
  }

  const { branch, scores, staff, equipment, recentTasks } = branchData;
  const completedTasks = recentTasks.filter(t => t.status === 'tamamlandi').length;
  const pendingTasks = recentTasks.filter(t => t.status === 'bekliyor').length;
  const activeEquipment = equipment.filter(e => e.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/subeler">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{branch.name}</h1>
          <p className="text-muted-foreground">{branch.city} • {branch.address}</p>
        </div>
      </div>

      {/* Composite Performance Score */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Genel Performans Skoru
          </CardTitle>
          <CardDescription>4 ana kategorinin ağırlıklı ortalaması</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary" data-testid="composite-score">
              {scores.compositeScore.toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">100 üzerinden</p>
          </div>
          <Progress value={scores.compositeScore} className="h-2" data-testid="progress-composite" />
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personel Performansı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="score-employee">{scores.employeePerformanceScore.toFixed(1)}</div>
            <Progress value={scores.employeePerformanceScore} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Ağırlık: %40</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ekipman Durumu</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="score-equipment">{scores.equipmentScore.toFixed(1)}</div>
            <Progress value={scores.equipmentScore} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Ağırlık: %25</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kalite Denetimi</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="score-quality">{scores.qualityAuditScore.toFixed(1)}</div>
            <Progress value={scores.qualityAuditScore} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Ağırlık: %20</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Müşteri Memnuniyeti</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="score-satisfaction">{scores.customerSatisfactionScore.toFixed(1)}</div>
            <Progress value={scores.customerSatisfactionScore} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Ağırlık: %15</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personel" data-testid="tab-personnel">Personel</TabsTrigger>
          <TabsTrigger value="gorevler" data-testid="tab-tasks">Görevler</TabsTrigger>
          <TabsTrigger value="ekipman" data-testid="tab-equipment">Ekipman</TabsTrigger>
        </TabsList>

        <TabsContent value="personel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Şube Personeli</CardTitle>
              <CardDescription>{staff.length} çalışan</CardDescription>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <p className="text-muted-foreground">Henüz personel eklenmemiş</p>
              ) : (
                <div className="space-y-2">
                  {staff.map((emp) => (
                    <Link key={emp.id} href={`/personel/${emp.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`employee-${emp.id}`}>
                        <div className="flex-1">
                          <p className="font-medium">{emp.fullName}</p>
                          <p className="text-sm text-muted-foreground">{emp.role}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {emp.performanceScore !== undefined && (
                            <div className="flex items-center gap-2" data-testid={`performance-${emp.id}`}>
                              <Award className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{emp.performanceScore.toFixed(1)}</span>
                            </div>
                          )}
                          <Badge variant={emp.isActive ? "default" : "secondary"}>
                            {emp.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gorevler" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Son Görevler</CardTitle>
              <CardDescription>
                {completedTasks} tamamlandı, {pendingTasks} bekliyor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <p className="text-muted-foreground">Henüz görev yok</p>
              ) : (
                <div className="space-y-2">
                  {recentTasks.slice(0, 10).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`task-${task.id}`}>
                      <div>
                        <p className="font-medium">{task.description}</p>
                        <p className="text-sm text-muted-foreground">{task.assignedTo}</p>
                      </div>
                      <Badge variant={task.status === 'tamamlandi' ? "default" : "secondary"}>
                        {task.status === 'tamamlandi' ? 'Tamamlandı' : 'Bekliyor'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ekipman" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ekipman</CardTitle>
              <CardDescription>{activeEquipment} aktif ekipman</CardDescription>
            </CardHeader>
            <CardContent>
              {equipment.length === 0 ? (
                <p className="text-muted-foreground">Henüz ekipman eklenmemiş</p>
              ) : (
                <div className="space-y-2">
                  {equipment.map((equip) => (
                    <div key={equip.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`equipment-${equip.id}`}>
                      <div>
                        <p className="font-medium">{equip.equipmentType}</p>
                        <p className="text-sm text-muted-foreground">{equip.serialNumber}</p>
                      </div>
                      <Badge variant={equip.isActive ? "default" : "secondary"}>
                        {equip.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
