import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ClipboardList, Plus, FileText, CheckCircle2, Clock,
  Building2, User, Calendar
} from "lucide-react";

type AuditInstance = {
  id: number;
  templateId: number;
  auditType: string;
  branchId: number | null;
  userId: string | null;
  auditorId: string;
  auditDate: string;
  status: string;
  totalScore: number | null;
  maxScore: number | null;
  templateTitle: string;
  targetName: string;
};

type AuditTemplate = {
  id: number;
  title: string;
  description: string | null;
  auditType: string;
  category: string;
  isActive: boolean;
};

type Branch = {
  id: number;
  name: string;
};

export default function DenetimlerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  // Fetch audits (filtered by role)
  const filters: any = {};
  if (user?.role === 'supervisor' && user?.branchId) {
    filters.branchId = user.branchId;
  }

  const queryParams = new URLSearchParams(filters);
  const queryUrl = queryParams.toString() 
    ? `/api/audit-instances?${queryParams}` 
    : '/api/audit-instances';

  const { data: audits = [], isLoading: auditsLoading } = useQuery<AuditInstance[]>({
    queryKey: ['/api/audit-instances', filters],
    queryFn: () => fetch(queryUrl, { credentials: 'include' }).then(res => {
      if (!res.ok) throw new Error('Denetimler yüklenemedi');
      return res.json();
    }),
  });

  // Fetch active templates for creating new audits
  const { data: templates = [] } = useQuery<AuditTemplate[]>({
    queryKey: ['/api/audit-templates', { auditType: 'branch', isActive: 'true' }],
    queryFn: () => fetch('/api/audit-templates?auditType=branch&isActive=true', { credentials: 'include' }).then(res => {
      if (!res.ok) throw new Error('Şablonlar yüklenemedi');
      return res.json();
    }),
  });

  // Fetch branches for target selection
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  // Create audit mutation
  const createMutation = useMutation({
    mutationFn: async (): Promise<AuditInstance> => {
      if (!selectedTemplateId || !selectedBranchId) {
        throw new Error('Şablon ve şube seçmelisiniz');
      }
      const response = await apiRequest('POST', '/api/audit-instances', {
        templateId: selectedTemplateId,
        auditType: 'branch',
        branchId: selectedBranchId,
        auditorId: user?.id,
      });
      return response as unknown as AuditInstance;
    },
    onSuccess: (newAudit: AuditInstance) => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-instances'] });
      toast({ title: "Denetim oluşturuldu", description: "Denetim başlatıldı. Şimdi maddeleri doldurabilirsiniz." });
      setIsCreateDialogOpen(false);
      setSelectedTemplateId(null);
      setSelectedBranchId(null);
      // Navigate to audit execution page
      window.location.href = `/denetim/${newAudit.id}`;
    },
    onError: (error: any) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Denetim oluşturulamadı",
        variant: "destructive"
      });
    },
  });

  const handleCreateAudit = () => {
    createMutation.mutate();
  };

  if (auditsLoading) {
    return <div className="flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  // Group audits by status
  const inProgressAudits = audits.filter(a => a.status === 'in_progress');
  const completedAudits = audits.filter(a => a.status === 'completed');

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Denetimler</h1>
          <p className="text-muted-foreground">Şube denetimlerini görüntüleyin ve yeni denetim başlatın</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-audit">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Denetim
        </Button>
      </div>

      {/* In Progress Audits */}
      {inProgressAudits.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Devam Eden Denetimler ({inProgressAudits.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgressAudits.map((audit) => (
              <Link key={audit.id} href={`/denetim/${audit.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-audit-${audit.id}`}>
                  <CardHeader>
                    <CardTitle className="text-base">{audit.templateTitle}</CardTitle>
                    <CardDescription>
                      <Building2 className="h-4 w-4 inline mr-1" />
                      {audit.targetName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Devam Ediyor
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(audit.auditDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Completed Audits */}
      <div className="grid grid-cols-1 gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Tamamlanan Denetimler ({completedAudits.length})
        </h2>
        {completedAudits.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <ClipboardList className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Henüz tamamlanmış denetim yok</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedAudits.map((audit) => (
              <Link key={audit.id} href={`/denetim/${audit.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-audit-${audit.id}`}>
                  <CardHeader>
                    <CardTitle className="text-base">{audit.templateTitle}</CardTitle>
                    <CardDescription>
                      <Building2 className="h-4 w-4 inline mr-1" />
                      {audit.targetName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="default">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Tamamlandı
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{audit.totalScore}/100</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(audit.auditDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Audit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-audit">
          <DialogHeader>
            <DialogTitle>Yeni Denetim Başlat</DialogTitle>
            <DialogDescription>
              Şube denetimi için şablon ve hedef şube seçin
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="template">Denetim Şablonu *</Label>
              <Select
                value={selectedTemplateId?.toString()}
                onValueChange={(value) => setSelectedTemplateId(parseInt(value))}
              >
                <SelectTrigger id="template" data-testid="select-template">
                  <SelectValue placeholder="Şablon seçin" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()} data-testid={`option-template-${template.id}`}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="branch">Hedef Şube *</Label>
              <Select
                value={selectedBranchId?.toString()}
                onValueChange={(value) => setSelectedBranchId(parseInt(value))}
              >
                <SelectTrigger id="branch" data-testid="select-branch">
                  <SelectValue placeholder="Şube seçin" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()} data-testid={`option-branch-${branch.id}`}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              data-testid="button-dialog-cancel"
            >
              İptal
            </Button>
            <Button
              onClick={handleCreateAudit}
              disabled={!selectedTemplateId || !selectedBranchId || createMutation.isPending}
              data-testid="button-dialog-submit"
            >
              {createMutation.isPending ? 'Oluşturuluyor...' : 'Denetim Başlat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
