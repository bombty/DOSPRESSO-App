import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, CheckCircle2, Clock, Wrench, TrendingUp } from "lucide-react";

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

  // Fetch branch details
  const { data: branch, isLoading: branchLoading } = useQuery<Branch>({
    queryKey: ["/api/branches", branchId],
    queryFn: async () => {
      const token = localStorage.getItem('dospresso_token');
      const res = await fetch(`/api/branches/${branchId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    enabled: !!branchId,
  });

  // Fetch branch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery<User[]>({
    queryKey: ["/api/employees", branchId.toString()],
    queryFn: async () => {
      const token = localStorage.getItem('dospresso_token');
      const res = await fetch(`/api/employees?branchId=${branchId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    enabled: !!branchId,
  });

  // Fetch branch tasks
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks", branchId],
    queryFn: async () => {
      const token = localStorage.getItem('dospresso_token');
      const res = await fetch(`/api/tasks?branchId=${branchId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    enabled: !!branchId,
  });

  // Fetch branch equipment
  const { data: equipment = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment", branchId],
    queryFn: async () => {
      const token = localStorage.getItem('dospresso_token');
      const res = await fetch(`/api/equipment?branchId=${branchId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    enabled: !!branchId,
  });

  if (branchLoading) {
    return <div className="flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  if (!branch) {
    return <div className="flex items-center justify-center h-full">Şube bulunamadı</div>;
  }

  const completedTasks = tasks.filter(t => t.status === 'tamamlandi').length;
  const pendingTasks = tasks.filter(t => t.status === 'bekliyor').length;
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Aktif çalışan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan Görevler</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">Bu ay</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Görevler</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Henüz tamamlanmadı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ekipman</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEquipment}</div>
            <p className="text-xs text-muted-foreground">Aktif ekipman</p>
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
              <CardDescription>{employees.length} çalışan</CardDescription>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <p className="text-muted-foreground">Yükleniyor...</p>
              ) : employees.length === 0 ? (
                <p className="text-muted-foreground">Henüz personel eklenmemiş</p>
              ) : (
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <Link key={emp.id} href={`/ik?employee=${emp.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate" data-testid={`employee-${emp.id}`}>
                        <div>
                          <p className="font-medium">{emp.fullName}</p>
                          <p className="text-sm text-muted-foreground">{emp.role}</p>
                        </div>
                        <Badge variant={emp.isActive ? "default" : "secondary"}>
                          {emp.isActive ? "Aktif" : "Pasif"}
                        </Badge>
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
              <CardTitle>Görevler</CardTitle>
              <CardDescription>
                {completedTasks} tamamlandı, {pendingTasks} bekliyor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground">Henüz görev yok</p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 10).map((task) => (
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
