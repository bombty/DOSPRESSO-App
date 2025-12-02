import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, MessageSquare, BookOpen, UserPlus } from "lucide-react";

export default function AcademySocialGroups() {
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data: studyGroups = [] } = useQuery({
    queryKey: ["/api/academy/study-groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/academy/study-groups/${user.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-2 mb-2">
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
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          Sosyal İşbirliği
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Çalışma grupları</p>
      </div>

      {/* Study Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {studyGroups.length > 0 ? (
          studyGroups.map((group: any) => (
            <Card key={group.id} className="cursor-pointer hover-elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-1">
                  <span className="line-clamp-1">{group.name}</span>
                  <Badge variant="outline" className="text-xs">{group.memberCount}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xs line-clamp-2">{group.description}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1 h-8">
                    <MessageSquare className="w-3 h-3 mr-0.5" />
                    <span className="text-xs">Sohbet</span>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8">
                    <BookOpen className="w-3 h-3 mr-0.5" />
                    <span className="text-xs">Kaynaklar</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2">
            <CardContent className="py-6 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">Henüz grup yok</p>
              <Button size="sm" className="mt-2 h-8">
                <UserPlus className="w-3 h-3 mr-1" />
                Oluştur
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mentorship Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <Users className="w-4 h-4" />
            Mentörlük
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Button variant="outline" className="w-full text-xs h-8">
              Mentör Bul
            </Button>
            <Button variant="outline" className="w-full text-xs h-8">
              Mentee Kabul Et
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
