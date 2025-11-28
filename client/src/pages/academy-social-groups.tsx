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
      div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-500" />
          Sosyal İşbirliği
        </h1>
        <p className="text-muted-foreground mt-2">Çalışma grupları ve akran öğrenmesi</p>
      </div>

      {/* Study Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {studyGroups.length > 0 ? (
          studyGroups.map((group: any) => (
            <Card key={group.id} className="cursor-pointer hover-elevate">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{group.name}</span>
                  <Badge variant="outline">{group.memberCount} üye</Badge>
                </CardTitle>
                <CardDescription>{group.topic}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{group.description}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Sohbet
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Kaynaklar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Henüz çalışma grubu yok</p>
              <Button size="sm" className="mt-4">
                <UserPlus className="w-3 h-3 mr-1" />
                Grup Oluştur
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mentorship Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Mentörlük
          </CardTitle>
          <CardDescription>Deneyimli arkadaşlarından öğren veya diğerlerine rehberlik et</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" className="w-full">
              Mentör Bul
            </Button>
            <Button variant="outline" className="w-full">
              Mentee Kabul Et
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
