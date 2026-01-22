import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, CheckCircle2, Clock, UserX, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface PersonnelStatus {
  id: number;
  name: string;
  avatar?: string;
  role: string;
  status: 'active' | 'on_shift' | 'late' | 'absent' | 'on_leave';
  checkInTime?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Aktif', color: 'text-green-600', bgColor: 'bg-green-500/10' },
  on_shift: { label: 'Vardiyada', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  late: { label: 'Geç Kaldı', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' },
  absent: { label: 'Gelmedi', color: 'text-red-600', bgColor: 'bg-red-500/10' },
  on_leave: { label: 'İzinli', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

function PersonnelRow({ person, onNavigate }: { person: PersonnelStatus; onNavigate: (path: string) => void }) {
  const config = STATUS_CONFIG[person.status] || STATUS_CONFIG.active;
  
  return (
    <div 
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${config.bgColor}`}
      onClick={() => onNavigate(`/personel/${person.id}`)}
      data-testid={`personnel-status-${person.id}`}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={person.avatar} />
        <AvatarFallback className="text-xs">
          {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{person.name}</p>
        <p className="text-[10px] text-muted-foreground">{person.role}</p>
      </div>
      <div className="text-right">
        <Badge variant="outline" className={`text-[10px] ${config.color}`}>
          {config.label}
        </Badge>
        {person.checkInTime && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{person.checkInTime}</p>
        )}
      </div>
    </div>
  );
}

export function PersonnelStatusPanel() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const { data: personnel, isLoading, isError, refetch } = useQuery<PersonnelStatus[]>({
    queryKey: ["/api/branch/personnel-status"],
    enabled: !!user?.branchId,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Personel Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Personel Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-xs text-muted-foreground">Veri yüklenemedi</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Tekrar Dene
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!personnel || personnel.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Personel Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            Personel verisi yok
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeCount = personnel.filter(p => p.status === 'active' || p.status === 'on_shift').length;
  const lateCount = personnel.filter(p => p.status === 'late').length;
  const absentCount = personnel.filter(p => p.status === 'absent').length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Personel Durumu
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {activeCount}
            </Badge>
            {lateCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-600">
                <Clock className="h-3 w-3 mr-1" />
                {lateCount}
              </Badge>
            )}
            {absentCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600">
                <UserX className="h-3 w-3 mr-1" />
                {absentCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[180px]">
          <div className="space-y-1">
            {personnel.map((person) => (
              <PersonnelRow 
                key={person.id} 
                person={person}
                onNavigate={navigate}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
