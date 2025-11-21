import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Filter, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";

export default function PersonelYonetimi() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const { data: employees, isLoading: employeesLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  const { data: branches, isLoading: branchesLoading } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: !!user,
  });

  const isLoading = employeesLoading || branchesLoading;

  // Filter employees based on user role and filters
  const filteredEmployees = employees?.filter((employee) => {
    // Branch users see only their branch
    if (user?.branchId && employee.branchId !== user.branchId) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.toLowerCase();
      const email = (employee.email || "").toLowerCase();
      if (!fullName.includes(query) && !email.includes(query)) {
        return false;
      }
    }

    // Role filter
    if (roleFilter !== "all" && employee.role !== roleFilter) {
      return false;
    }

    // Branch filter (HQ only)
    if (branchFilter !== "all" && employee.branchId?.toString() !== branchFilter) {
      return false;
    }

    return true;
  }) || [];

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    muhasebe: "Muhasebe",
    satinalma: "Satınalma",
    coach: "Coach",
    teknik: "Teknik",
    destek: "Destek",
    fabrika: "Fabrika",
    yatirimci_hq: "Yatırımcı (HQ)",
    supervisor: "Supervisor",
    supervisor_buddy: "Supervisor Buddy",
    barista: "Barista",
    bar_buddy: "Bar Buddy",
    stajyer: "Stajyer",
    yatirimci: "Yatırımcı",
  };

  const getRoleVariant = (role: string): "default" | "secondary" | "outline" => {
    if (["admin", "supervisor"].includes(role)) return "default";
    if (["barista", "bar_buddy"].includes(role)) return "secondary";
    return "outline";
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    if (!firstName || !lastName) return "?";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personel Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Personel bilgilerini görüntüleyin, özlük dosyalarını yönetin
          </p>
        </div>
        <Button data-testid="button-add-employee" variant="default">
          <UserPlus className="h-4 w-4 mr-2" />
          Yeni Personel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
          <CardDescription>Personel listesini filtreleyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-search-employee"
                placeholder="İsim veya e-posta ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger data-testid="select-role-filter">
                <SelectValue placeholder="Rol filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Roller</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                <SelectItem value="barista">Barista</SelectItem>
                <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                <SelectItem value="stajyer">Stajyer</SelectItem>
              </SelectContent>
            </Select>

            {!user?.branchId && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger data-testid="select-branch-filter">
                  <SelectValue placeholder="Şube filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personel Listesi ({filteredEmployees.length})</CardTitle>
          <CardDescription>
            {user?.branchId
              ? "Şubenizin personel listesi"
              : "Tüm şubelerin personel listesi"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Filtrelerinize uygun personel bulunamadı</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personel</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Şube</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={employee.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {getInitials(employee.firstName, employee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium" data-testid={`text-employee-name-${employee.id}`}>
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleVariant(employee.role)} data-testid={`badge-role-${employee.id}`}>
                          {roleLabels[employee.role] || employee.role}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-branch-${employee.id}`}>
                        {employee.branchId
                          ? branches?.find((b) => b.id === employee.branchId)?.name || "Bilinmiyor"
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{employee.phoneNumber || "-"}</p>
                          {employee.emergencyContactName && (
                            <p className="text-xs text-muted-foreground">
                              Acil: {employee.emergencyContactName}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.accountStatus === "active" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid={`badge-status-${employee.id}`}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200" data-testid={`badge-status-${employee.id}`}>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {employee.accountStatus === "pending" ? "Onay Bekliyor" : "Pasif"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/personel-yonetimi/${employee.id}`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-employee-${employee.id}`}>
                            <FileText className="h-4 w-4 mr-1" />
                            Detay
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
