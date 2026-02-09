import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Users,
  Coffee,
  Briefcase,
  CheckCircle2,
  Clock,
  RefreshCw,
  Building2,
  AlertCircle,
} from "lucide-react";

interface HqActiveSession {
  session: {
    id: number;
    userId: string;
    checkInTime: string;
    status: string;
    breakMinutes: number;
    outsideMinutes: number;
    netWorkMinutes: number;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    profileImageUrl: string | null;
  };
}

export default function HqStaffDashboard() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: sessions = [], isLoading, refetch } = useQuery<HqActiveSession[]>({
    queryKey: ["/api/hq/kiosk/active-sessions"],
    refetchInterval: 30000,
  });

  const activeSessions = sessions.filter((s) => s.session.status === "active");
  const breakSessions = sessions.filter((s) => s.session.status === "on_break");
  const outsideSessions = sessions.filter((s) => s.session.status === "outside");

  const getElapsedMinutes = (checkInTime: string) => {
    return Math.floor((now - new Date(checkInTime).getTime()) / 60000);
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}s ${m}dk`;
    return `${m}dk`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Calisiyor</Badge>;
      case "on_break":
        return <Badge variant="secondary">Molada</Badge>;
      case "outside":
        return <Badge className="bg-blue-600 text-white">Dis Gorevde</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "on_break": return <Coffee className="h-4 w-4 text-yellow-500" />;
      case "outside": return <Briefcase className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold" data-testid="text-hq-dashboard-title">HQ Personel Durumu</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-hq">
          <RefreshCw className="h-4 w-4 mr-2" /> Yenile
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold" data-testid="text-total-active">{sessions.length}</p>
            <p className="text-xs text-muted-foreground">Toplam Aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold" data-testid="text-working">{activeSessions.length}</p>
            <p className="text-xs text-muted-foreground">Calisiyor</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Coffee className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold" data-testid="text-on-break">{breakSessions.length}</p>
            <p className="text-xs text-muted-foreground">Molada</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold" data-testid="text-outside">{outsideSessions.length}</p>
            <p className="text-xs text-muted-foreground">Dis Gorevde</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Simdi aktif oturum yok</p>
            <p className="text-sm text-muted-foreground">HQ personeli kiosk uzerinden giris yaptiginda burada gorunecektir</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sessions.map((item) => (
            <Card key={item.session.id} className="hover-elevate" data-testid={`hq-session-card-${item.session.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={item.user.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                      {item.user.firstName?.[0]}{item.user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.user.firstName} {item.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.user.role}</p>
                  </div>
                  {getStatusIcon(item.session.status)}
                </div>
                
                <div className="space-y-2">
                  {getStatusBadge(item.session.status)}
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-center p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground">Giris</p>
                      <p className="text-xs font-medium">
                        {new Date(item.session.checkInTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground">Sure</p>
                      <p className="text-xs font-medium">
                        {formatDuration(getElapsedMinutes(item.session.checkInTime))}
                      </p>
                    </div>
                  </div>

                  {(item.session.breakMinutes > 0 || item.session.outsideMinutes > 0) && (
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {item.session.breakMinutes > 0 && (
                        <span>Mola: {formatDuration(item.session.breakMinutes)}</span>
                      )}
                      {item.session.outsideMinutes > 0 && (
                        <span>Dis: {formatDuration(item.session.outsideMinutes)}</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
