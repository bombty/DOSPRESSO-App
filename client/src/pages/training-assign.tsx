import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Award, Users, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isHQRole } from "@shared/schema";

export default function TrainingAssign() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: materials, isLoading: materialsLoading } = useQuery<any[]>({
    queryKey: ["/api/training/materials"],
    queryFn: async () => {
      const response = await fetch("/api/training/materials?status=published");
      if (!response.ok) return [];
      return response.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data) => {
      return apiRequest("POST", "/api/training/assignments", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Eğitim atandı" });
      setSelectedMaterial("");
      setSelectedRole("");
      setDueDate("");
      queryClient.invalidateQueries({ queryKey: ["/api/training/assignments"] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (!isHQRole(user?.role as any)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Bu sayfaya erişim izniniz yok</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/hq">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Eğitim Ataması</h1>
          <p className="text-muted-foreground">Personel ve rollere eğitim materyali atayın</p>
        </div>
      </div>

      <Tabs defaultValue="assign" className="w-full">
        <TabsList>
          <TabsTrigger value="assign">
            <Award className="h-4 w-4 mr-2" />
            Atama Yap
          </TabsTrigger>
          <TabsTrigger value="status">
            <CheckCircle className="h-4 w-4 mr-2" />
            Durum
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Toplu Eğitim Ataması</CardTitle>
              <CardDescription>Rol grubuna eğitim materyali atayın</CardDescription>
            </CardHeader>
            <CardContent className="w-full space-y-2 sm:space-y-3">
              <div>
                <Label htmlFor="material">Eğitim Materyali *</Label>
                <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Materyali seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialsLoading ? (
                      <SelectItem value="loading" disabled>Yükleniyor...</SelectItem>
                    ) : (
                      materials?.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="role">Hedef Rol *</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rolü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="teknik">Teknik</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">Son Tarih</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={() =>
                  assignMutation.mutate({
                    materialId: parseInt(selectedMaterial),
                    targetRole: selectedRole,
                    dueDate: dueDate || null,
                    isRequired: true,
                  })
                }
                disabled={!selectedMaterial || !selectedRole || assignMutation.isPending}
              >
                {assignMutation.isPending ? "Atanıyor..." : "Atama Yap"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Atama Durumu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Atama durumu sayfası yakında eklenecek</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
