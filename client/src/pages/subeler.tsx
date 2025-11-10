import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Phone, User } from "lucide-react";
import { Link } from "wouter";

type Branch = {
  id: number;
  name: string;
  address: string;
  city: string;
  phoneNumber: string;
  managerName: string;
};

export default function SubelerPage() {
  const { user } = useAuth();

  const { data: branches = [], isLoading, error } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: !!user,
  });

  // Filter branches based on user role
  // Branch users can only see their own branch, HQ users see all branches
  const filteredBranches = branches.filter((branch) => {
    if (!user?.role) return false;
    
    // HQ users see all branches
    if (isHQRole(user.role as any)) {
      return true;
    }
    
    // Branch users only see their own branch
    return user.branchId === branch.id;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-lg text-destructive">Şubeler yüklenirken hata oluştu</p>
        <p className="text-sm text-muted-foreground">Lütfen sistem yöneticinize başvurun</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Şubeler</h1>
        <p className="text-muted-foreground mt-1">
          DOSPRESSO şubelerini görüntüleyin ve yönetin
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBranches.map((branch) => (
          <Link key={branch.id} href={`/subeler/${branch.id}`}>
            <Card className="hover-elevate active-elevate-2 cursor-pointer h-full" data-testid={`card-branch-${branch.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {branch.name}
                </CardTitle>
                <CardDescription>{branch.city}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{branch.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Yönetici: {branch.managerName}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredBranches.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Henüz şube bulunamadı</p>
        </div>
      )}
    </div>
  );
}
