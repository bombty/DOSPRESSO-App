import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  Check,
  X,
  Clock,
  AlertTriangle,
  Eye,
  Camera,
  RefreshCw,
  Trash2,
  Ruler,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  Shield,
  Beaker,
  PauseCircle,
  UserCheck,
  ThermometerSun,
  Package,
  Scale,
  Microscope,
} from "lucide-react";

interface ProductionOutput {
  id: number;
  sessionId: number;
  userId: string;
  stationId: number;
  producedQuantity: string;
  producedUnit: string;
  wasteQuantity: string;
  wasteUnit: string;
  qualityStatus: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  stationName: string;
  photoUrl?: string | null;
}

interface PendingEngineerCheck {
  id: number;
  productionOutputId: number;
  inspectorId: string;
  producerId: string;
  stationId: number;
  decision: string;
  decisionReason: string | null;
  visualInspection: string | null;
  weightCheck: string | null;
  packagingIntegrity: string | null;
  temperatureCheck: string | null;
  allergenCheck: boolean;
  haccpCompliance: boolean;
  inspectorNotes: string | null;
  checkedAt: string;
  producedQuantity: string;
  producedUnit: string;
  wasteQuantity: string;
  wasteUnit: string;
  producerFirstName: string;
  producerLastName: string;
  stationName: string;
}

interface QualitySpec {
  id: number;
  stationId: number;
  productId: number | null;
  name: string;
  description: string | null;
  measurementType: 'numeric' | 'boolean' | 'text';
  unit: string | null;
  minValue: string | null;
  maxValue: string | null;
  targetValue: string | null;
  isRequired: boolean;
  requirePhoto: boolean;
  sortOrder: number;
}

interface CriteriaCheck {
  specId: number;
  checked: boolean;
  value?: string;
  notes?: string;
}

type CheckResult = 'pass' | 'fail' | 'warning' | '';

export default function FabrikaKaliteKontrol() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEngineer = user?.role === 'gida_muhendisi' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState("pending");
  const [selectedOutput, setSelectedOutput] = useState<ProductionOutput | null>(null);
  const [techReviewDialogOpen, setTechReviewDialogOpen] = useState(false);
  const [engineerDialogOpen, setEngineerDialogOpen] = useState(false);
  const [selectedEngineerCheck, setSelectedEngineerCheck] = useState<PendingEngineerCheck | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [criteriaChecks, setCriteriaChecks] = useState<CriteriaCheck[]>([]);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  const [visualInspection, setVisualInspection] = useState<CheckResult>('');
  const [weightCheck, setWeightCheck] = useState<CheckResult>('');
  const [packagingIntegrity, setPackagingIntegrity] = useState<CheckResult>('');
  const [temperatureCheck, setTemperatureCheck] = useState<CheckResult>('');
  const [allergenCheck, setAllergenCheck] = useState(false);
  const [haccpCompliance, setHaccpCompliance] = useState(true);
  const [inspectorNotes, setInspectorNotes] = useState("");

  const [engTasteTest, setEngTasteTest] = useState<CheckResult>('');
  const [engTextureCheck, setEngTextureCheck] = useState<CheckResult>('');
  const [engHaccpCompliance, setEngHaccpCompliance] = useState(true);
  const [engCorrectiveAction, setEngCorrectiveAction] = useState("");
  const [engHoldReason, setEngHoldReason] = useState("");
  const [engNotes, setEngNotes] = useState("");

  const { data: pendingOutputs = [], isLoading: loadingPending, refetch: refetchPending } = useQuery<ProductionOutput[]>({
    queryKey: ['/api/factory/quality/pending'],
  });

  const { data: approvedOutputs = [], isLoading: loadingApproved } = useQuery<ProductionOutput[]>({
    queryKey: ['/api/factory/quality/approved'],
  });

  const { data: rejectedOutputs = [], isLoading: loadingRejected } = useQuery<ProductionOutput[]>({
    queryKey: ['/api/factory/quality/rejected'],
  });

  const { data: pendingEngineerChecks = [], isLoading: loadingEngineer } = useQuery<PendingEngineerCheck[]>({
    queryKey: ['/api/factory/quality/pending-engineer'],
  });

  const { data: qualitySpecs = [] } = useQuery<QualitySpec[]>({
    queryKey: ['/api/factory/quality-specs/station', selectedOutput?.stationId],
    enabled: !!selectedOutput?.stationId && techReviewDialogOpen,
  });

  useEffect(() => {
    if (qualitySpecs.length > 0 && techReviewDialogOpen) {
      setCriteriaChecks(qualitySpecs.map(spec => ({
        specId: spec.id,
        checked: false,
        value: '',
        notes: ''
      })));
    }
  }, [qualitySpecs, techReviewDialogOpen]);

  const reviewMutation = useMutation({
    mutationFn: async (data: { outputId: number; decision: 'approved' | 'rejected'; reason?: string }) => {
      const res = await apiRequest('POST', '/api/factory/quality/review', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kalite kontrolü kaydedildi" });
      invalidateAll();
      setTechReviewDialogOpen(false);
      setSelectedOutput(null);
      setDecisionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const techReviewMutation = useMutation({
    mutationFn: async (data: {
      outputId: number;
      decision: 'approved' | 'rejected';
      reason?: string;
      visualInspection?: string;
      weightCheck?: string;
      packagingIntegrity?: string;
      temperatureCheck?: string;
      allergenCheck?: boolean;
      haccpCompliance?: boolean;
      inspectorNotes?: string;
    }) => {
      const res = await apiRequest('POST', '/api/factory/quality/technician-review', data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.requiresEngineerApproval
          ? "Gıda Mühendisi Onayı Bekleniyor"
          : "Kalite Kontrolü Tamamlandı",
        description: data.message,
      });
      invalidateAll();
      closeTechReviewDialog();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const engineerApproveMutation = useMutation({
    mutationFn: async (data: {
      checkId: number;
      decision: 'approved' | 'rejected' | 'hold';
      tasteTest?: string;
      textureCheck?: string;
      haccpCompliance?: boolean;
      correctiveAction?: string;
      holdReason?: string;
      notes?: string;
    }) => {
      const { checkId, ...body } = data;
      const res = await apiRequest('PATCH', `/api/factory/quality/engineer-approve/${checkId}`, body);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Gıda Mühendisi Kararı Kaydedildi", description: data.message });
      invalidateAll();
      closeEngineerDialog();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['/api/factory/quality/pending'] });
    queryClient.invalidateQueries({ queryKey: ['/api/factory/quality/approved'] });
    queryClient.invalidateQueries({ queryKey: ['/api/factory/quality/rejected'] });
    queryClient.invalidateQueries({ queryKey: ['/api/factory/quality/pending-engineer'] });
  }

  function openTechReviewDialog(output: ProductionOutput) {
    setSelectedOutput(output);
    setDecisionReason("");
    setVisualInspection('');
    setWeightCheck('');
    setPackagingIntegrity('');
    setTemperatureCheck('');
    setAllergenCheck(false);
    setHaccpCompliance(true);
    setInspectorNotes("");
    setTechReviewDialogOpen(true);
  }

  function closeTechReviewDialog() {
    setTechReviewDialogOpen(false);
    setSelectedOutput(null);
  }

  function openEngineerDialog(check: PendingEngineerCheck) {
    setSelectedEngineerCheck(check);
    setEngTasteTest('');
    setEngTextureCheck('');
    setEngHaccpCompliance(true);
    setEngCorrectiveAction("");
    setEngHoldReason("");
    setEngNotes("");
    setEngineerDialogOpen(true);
  }

  function closeEngineerDialog() {
    setEngineerDialogOpen(false);
    setSelectedEngineerCheck(null);
  }

  function submitTechReview(decision: 'approved' | 'rejected') {
    if (!selectedOutput) return;
    techReviewMutation.mutate({
      outputId: selectedOutput.id,
      decision,
      reason: decisionReason || undefined,
      visualInspection: visualInspection || undefined,
      weightCheck: weightCheck || undefined,
      packagingIntegrity: packagingIntegrity || undefined,
      temperatureCheck: temperatureCheck || undefined,
      allergenCheck,
      haccpCompliance,
      inspectorNotes: inspectorNotes || undefined,
    });
  }

  function submitEngineerDecision(decision: 'approved' | 'rejected' | 'hold') {
    if (!selectedEngineerCheck) return;
    engineerApproveMutation.mutate({
      checkId: selectedEngineerCheck.id,
      decision,
      tasteTest: engTasteTest || undefined,
      textureCheck: engTextureCheck || undefined,
      haccpCompliance: engHaccpCompliance,
      correctiveAction: engCorrectiveAction || undefined,
      holdReason: engHoldReason || undefined,
      notes: engNotes || undefined,
    });
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600"><Check className="h-3 w-3 mr-1" />Onaylandı</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Reddedildi</Badge>;
      case 'pending_engineer':
        return <Badge className="bg-blue-600"><Shield className="h-3 w-3 mr-1" />Mühendis Bekliyor</Badge>;
      case 'hold':
        return <Badge className="bg-orange-600"><PauseCircle className="h-3 w-3 mr-1" />Beklemede</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Bekliyor</Badge>;
    }
  };

  const getCheckResultBadge = (result: string | null) => {
    if (!result) return <span className="text-muted-foreground">-</span>;
    switch (result) {
      case 'pass':
        return <Badge className="bg-green-600" data-testid="badge-pass"><Check className="h-3 w-3 mr-1" />Geçti</Badge>;
      case 'fail':
        return <Badge variant="destructive" data-testid="badge-fail"><X className="h-3 w-3 mr-1" />Kaldı</Badge>;
      case 'warning':
        return <Badge className="bg-orange-500" data-testid="badge-warning"><AlertTriangle className="h-3 w-3 mr-1" />Uyarı</Badge>;
      default:
        return <span className="text-muted-foreground">{result}</span>;
    }
  };

  const CheckResultSelect = ({ value, onChange, label, icon: Icon, testId }: {
    value: CheckResult;
    onChange: (v: CheckResult) => void;
    label: string;
    icon: any;
    testId: string;
  }) => (
    <div className="space-y-1">
      <Label className="flex items-center gap-1.5 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as CheckResult)}>
        <SelectTrigger data-testid={testId}>
          <SelectValue placeholder="Seçin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pass">Geçti</SelectItem>
          <SelectItem value="fail">Kaldı</SelectItem>
          <SelectItem value="warning">Uyarı</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderOutputTable = (outputs: ProductionOutput[], showActions: boolean = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Personel</TableHead>
          <TableHead>İstasyon</TableHead>
          <TableHead>Üretim</TableHead>
          <TableHead>Zaiyat</TableHead>
          <TableHead>Tarih</TableHead>
          <TableHead>Durum</TableHead>
          {showActions && <TableHead>İşlem</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {outputs.map((output) => (
          <TableRow key={output.id} data-testid={`row-output-${output.id}`}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={output.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-amber-600 text-white text-xs">
                    {output.firstName[0]}{output.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{output.firstName} {output.lastName}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{output.stationName}</Badge>
            </TableCell>
            <TableCell>
              <span className="font-semibold text-green-600">
                {output.producedQuantity} {output.producedUnit}
              </span>
            </TableCell>
            <TableCell>
              {parseFloat(output.wasteQuantity) > 0 ? (
                <span className="text-red-500 flex items-center gap-1">
                  <Trash2 className="h-3 w-3" />
                  {output.wasteQuantity} {output.wasteUnit}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(output.createdAt).toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </TableCell>
            <TableCell>{getStatusBadge(output.qualityStatus)}</TableCell>
            {showActions && (
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openTechReviewDialog(output)}
                  data-testid={`button-tech-review-${output.id}`}
                >
                  <Microscope className="h-4 w-4 mr-1" />
                  Teknisyen Kontrol
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderEngineerTable = (checks: PendingEngineerCheck[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Personel</TableHead>
          <TableHead>İstasyon</TableHead>
          <TableHead>Üretim</TableHead>
          <TableHead>Görsel</TableHead>
          <TableHead>Ağırlık</TableHead>
          <TableHead>Ambalaj</TableHead>
          <TableHead>Tarih</TableHead>
          {isEngineer && <TableHead>İşlem</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {checks.map((check) => (
          <TableRow key={check.id} data-testid={`row-engineer-check-${check.id}`}>
            <TableCell>
              <span className="font-medium">{check.producerFirstName} {check.producerLastName}</span>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{check.stationName}</Badge>
            </TableCell>
            <TableCell>
              <span className="font-semibold text-green-600">
                {check.producedQuantity} {check.producedUnit}
              </span>
            </TableCell>
            <TableCell>{getCheckResultBadge(check.visualInspection)}</TableCell>
            <TableCell>{getCheckResultBadge(check.weightCheck)}</TableCell>
            <TableCell>{getCheckResultBadge(check.packagingIntegrity)}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(check.checkedAt).toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </TableCell>
            {isEngineer && (
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEngineerDialog(check)}
                  data-testid={`button-engineer-approve-${check.id}`}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  İncele
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Kalite Kontrol</h1>
            <p className="text-muted-foreground">Üretim çıktılarını kontrol edin</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => { refetchPending(); invalidateAll(); }} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen</p>
                <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingOutputs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Müh. Onay Bekleyen</p>
                <p className="text-2xl font-bold" data-testid="text-engineer-pending-count">{pendingEngineerChecks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Onaylanan</p>
                <p className="text-2xl font-bold" data-testid="text-approved-count">{approvedOutputs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <X className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reddedilen</p>
                <p className="text-2xl font-bold" data-testid="text-rejected-count">{rejectedOutputs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Üretim Çıktıları</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Bekleyen ({pendingOutputs.length})
              </TabsTrigger>
              <TabsTrigger value="pending_engineer" data-testid="tab-pending-engineer">
                <Shield className="h-3.5 w-3.5 mr-1" />
                Müh. Onayı ({pendingEngineerChecks.length})
              </TabsTrigger>
              <TabsTrigger value="approved" data-testid="tab-approved">
                Onaylanan ({approvedOutputs.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" data-testid="tab-rejected">
                Reddedilen ({rejectedOutputs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {loadingPending ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : pendingOutputs.length > 0 ? (
                renderOutputTable(pendingOutputs, true)
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Bekleyen kalite kontrolü yok</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending_engineer">
              {loadingEngineer ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : pendingEngineerChecks.length > 0 ? (
                <>
                  {!isEngineer && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Bu kayıtlar gıda mühendisi onayı bekliyor. Sadece gıda mühendisi onay verebilir.</span>
                    </div>
                  )}
                  {renderEngineerTable(pendingEngineerChecks)}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Gıda mühendisi onayı bekleyen kayıt yok</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved">
              {loadingApproved ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : approvedOutputs.length > 0 ? (
                renderOutputTable(approvedOutputs)
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Onaylanan üretim yok</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected">
              {loadingRejected ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : rejectedOutputs.length > 0 ? (
                renderOutputTable(rejectedOutputs)
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <X className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Reddedilen üretim yok</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={techReviewDialogOpen} onOpenChange={setTechReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-amber-500" />
              Teknisyen Kalite Kontrolü
            </DialogTitle>
          </DialogHeader>

          {selectedOutput && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedOutput.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-amber-600 text-white">
                          {selectedOutput.firstName[0]}{selectedOutput.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedOutput.firstName} {selectedOutput.lastName}</p>
                        <Badge variant="secondary">{selectedOutput.stationName}</Badge>
                      </div>
                    </div>
                    {selectedOutput.photoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPhotoDialogOpen(true)}
                        data-testid="button-view-photo"
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        Foto
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Üretim</p>
                      <p className="font-semibold text-green-600">
                        {selectedOutput.producedQuantity} {selectedOutput.producedUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Zaiyat</p>
                      <p className="font-semibold text-red-500">
                        {selectedOutput.wasteQuantity} {selectedOutput.wasteUnit}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-amber-500" />
                    <Label className="text-base font-semibold">Kontrol Kriterleri</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <CheckResultSelect
                      value={visualInspection}
                      onChange={setVisualInspection}
                      label="Görsel Kontrol"
                      icon={Eye}
                      testId="select-visual-inspection"
                    />
                    <CheckResultSelect
                      value={weightCheck}
                      onChange={setWeightCheck}
                      label="Ağırlık Kontrol"
                      icon={Scale}
                      testId="select-weight-check"
                    />
                    <CheckResultSelect
                      value={packagingIntegrity}
                      onChange={setPackagingIntegrity}
                      label="Ambalaj Bütünlüğü"
                      icon={Package}
                      testId="select-packaging-integrity"
                    />
                    <CheckResultSelect
                      value={temperatureCheck}
                      onChange={setTemperatureCheck}
                      label="Sıcaklık Kontrol"
                      icon={ThermometerSun}
                      testId="select-temperature-check"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <Label className="text-base font-semibold">Güvenlik Kontrolleri</Label>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Checkbox
                        id="allergen-check"
                        checked={allergenCheck}
                        onCheckedChange={(v) => setAllergenCheck(!!v)}
                        data-testid="checkbox-allergen"
                      />
                      <Label htmlFor="allergen-check" className="flex items-center gap-1.5 cursor-pointer">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Allerjen Kontrol Yapıldı
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Checkbox
                        id="haccp-compliance"
                        checked={haccpCompliance}
                        onCheckedChange={(v) => setHaccpCompliance(!!v)}
                        data-testid="checkbox-haccp"
                      />
                      <Label htmlFor="haccp-compliance" className="flex items-center gap-1.5 cursor-pointer">
                        <Shield className="h-4 w-4 text-green-500" />
                        HACCP Uyumlu
                      </Label>
                    </div>
                  </div>
                </div>

                {qualitySpecs.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-amber-500" />
                      <Label className="text-base font-semibold">Ek Kalite Kriterleri</Label>
                      <Badge variant="outline" className="ml-auto">
                        {criteriaChecks.filter(c => c.checked).length}/{qualitySpecs.length}
                      </Badge>
                    </div>
                    <div className="space-y-2 border rounded-lg p-3">
                      {qualitySpecs.map((spec) => {
                        const check = criteriaChecks.find(c => c.specId === spec.id);
                        return (
                          <div
                            key={spec.id}
                            className={`p-3 rounded-lg border ${check?.checked ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/30 border-muted'}`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={check?.checked || false}
                                onCheckedChange={(checked) => {
                                  setCriteriaChecks(prev => prev.map(c =>
                                    c.specId === spec.id ? { ...c, checked: !!checked } : c
                                  ));
                                }}
                                data-testid={`checkbox-spec-${spec.id}`}
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{spec.name}</span>
                                  {spec.isRequired && (
                                    <Badge variant="destructive" className="text-xs">Zorunlu</Badge>
                                  )}
                                  {spec.measurementType === 'numeric' && (
                                    <Badge variant="outline" className="text-xs">
                                      <Ruler className="h-3 w-3 mr-1" />
                                      {spec.minValue}-{spec.maxValue} {spec.unit}
                                    </Badge>
                                  )}
                                  {spec.measurementType === 'boolean' && (
                                    <Badge variant="outline" className="text-xs">
                                      <CheckSquare className="h-3 w-3 mr-1" />
                                      Evet/Hayır
                                    </Badge>
                                  )}
                                  {spec.measurementType === 'text' && (
                                    <Badge variant="outline" className="text-xs">
                                      <FileText className="h-3 w-3 mr-1" />
                                      Metin
                                    </Badge>
                                  )}
                                  {spec.requirePhoto && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Camera className="h-3 w-3 mr-1" />
                                      Foto
                                    </Badge>
                                  )}
                                </div>
                                {spec.description && (
                                  <p className="text-sm text-muted-foreground">{spec.description}</p>
                                )}
                                {spec.measurementType === 'numeric' && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Input
                                      type="number"
                                      placeholder={`Değer (${spec.minValue}-${spec.maxValue})`}
                                      className="w-32"
                                      value={check?.value || ''}
                                      onChange={(e) => {
                                        setCriteriaChecks(prev => prev.map(c =>
                                          c.specId === spec.id ? { ...c, value: e.target.value } : c
                                        ));
                                      }}
                                      data-testid={`input-spec-value-${spec.id}`}
                                    />
                                    <span className="text-sm text-muted-foreground">{spec.unit}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Teknisyen Notları (Opsiyonel)</Label>
                  <Textarea
                    placeholder="Kontrol hakkında not..."
                    value={inspectorNotes}
                    onChange={(e) => setInspectorNotes(e.target.value)}
                    rows={3}
                    data-testid="input-inspector-notes"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Karar Açıklaması (Opsiyonel)</Label>
                  <Textarea
                    placeholder="Kalite değerlendirmesi hakkında not..."
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    rows={2}
                    data-testid="input-decision-reason"
                  />
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={closeTechReviewDialog}
              data-testid="button-cancel-review"
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitTechReview('rejected')}
              disabled={techReviewMutation.isPending}
              data-testid="button-reject"
            >
              <X className="h-4 w-4 mr-1" />
              Reddet
            </Button>
            <Button
              className="bg-green-600"
              onClick={() => submitTechReview('approved')}
              disabled={techReviewMutation.isPending}
              data-testid="button-approve"
            >
              <Check className="h-4 w-4 mr-1" />
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={engineerDialogOpen} onOpenChange={setEngineerDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-500" />
              Gıda Mühendisi Onayı
            </DialogTitle>
          </DialogHeader>

          {selectedEngineerCheck && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{selectedEngineerCheck.producerFirstName} {selectedEngineerCheck.producerLastName}</p>
                      <Badge variant="secondary">{selectedEngineerCheck.stationName}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Üretim</p>
                      <p className="font-semibold text-green-600">
                        {selectedEngineerCheck.producedQuantity} {selectedEngineerCheck.producedUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Zaiyat</p>
                      <p className="font-semibold text-red-500">
                        {selectedEngineerCheck.wasteQuantity} {selectedEngineerCheck.wasteUnit}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-amber-500" />
                    Teknisyen Kontrol Sonuçları
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2 rounded-lg border">
                      <span className="text-sm flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Görsel
                      </span>
                      {getCheckResultBadge(selectedEngineerCheck.visualInspection)}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg border">
                      <span className="text-sm flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-muted-foreground" /> Ağırlık
                      </span>
                      {getCheckResultBadge(selectedEngineerCheck.weightCheck)}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg border">
                      <span className="text-sm flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" /> Ambalaj
                      </span>
                      {getCheckResultBadge(selectedEngineerCheck.packagingIntegrity)}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg border">
                      <span className="text-sm flex items-center gap-1.5">
                        <ThermometerSun className="h-3.5 w-3.5 text-muted-foreground" /> Sıcaklık
                      </span>
                      {getCheckResultBadge(selectedEngineerCheck.temperatureCheck)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <Badge variant={selectedEngineerCheck.allergenCheck ? "default" : "secondary"}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Allerjen: {selectedEngineerCheck.allergenCheck ? 'Kontrol Edildi' : 'Edilmedi'}
                    </Badge>
                    <Badge variant={selectedEngineerCheck.haccpCompliance ? "default" : "destructive"}>
                      <Shield className="h-3 w-3 mr-1" />
                      HACCP: {selectedEngineerCheck.haccpCompliance ? 'Uyumlu' : 'Uyumsuz'}
                    </Badge>
                  </div>
                  {selectedEngineerCheck.inspectorNotes && (
                    <div className="bg-muted/30 rounded-lg p-3 mt-2">
                      <p className="text-sm text-muted-foreground mb-1">Teknisyen Notu:</p>
                      <p className="text-sm">{selectedEngineerCheck.inspectorNotes}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Beaker className="h-4 w-4 text-blue-500" />
                    Mühendis Değerlendirmesi
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <CheckResultSelect
                      value={engTasteTest}
                      onChange={setEngTasteTest}
                      label="Tat Testi"
                      icon={Beaker}
                      testId="select-taste-test"
                    />
                    <CheckResultSelect
                      value={engTextureCheck}
                      onChange={setEngTextureCheck}
                      label="Doku Kontrolü"
                      icon={Microscope}
                      testId="select-texture-check"
                    />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Checkbox
                      id="eng-haccp"
                      checked={engHaccpCompliance}
                      onCheckedChange={(v) => setEngHaccpCompliance(!!v)}
                      data-testid="checkbox-eng-haccp"
                    />
                    <Label htmlFor="eng-haccp" className="flex items-center gap-1.5 cursor-pointer">
                      <Shield className="h-4 w-4 text-green-500" />
                      HACCP Uyumluluğu Onaylandı
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Düzeltici Faaliyet (Red durumunda zorunlu)</Label>
                  <Textarea
                    placeholder="Düzeltici faaliyet açıklaması..."
                    value={engCorrectiveAction}
                    onChange={(e) => setEngCorrectiveAction(e.target.value)}
                    rows={2}
                    data-testid="input-corrective-action"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hold Sebebi (Hold durumunda zorunlu)</Label>
                  <Textarea
                    placeholder="Beklemeye alma sebebi..."
                    value={engHoldReason}
                    onChange={(e) => setEngHoldReason(e.target.value)}
                    rows={2}
                    data-testid="input-hold-reason"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ek Notlar (Opsiyonel)</Label>
                  <Textarea
                    placeholder="Mühendis değerlendirme notları..."
                    value={engNotes}
                    onChange={(e) => setEngNotes(e.target.value)}
                    rows={2}
                    data-testid="input-engineer-notes"
                  />
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={closeEngineerDialog}
              data-testid="button-cancel-engineer"
            >
              İptal
            </Button>
            <Button
              className="bg-orange-600"
              onClick={() => submitEngineerDecision('hold')}
              disabled={engineerApproveMutation.isPending}
              data-testid="button-hold"
            >
              <PauseCircle className="h-4 w-4 mr-1" />
              Beklet
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitEngineerDecision('rejected')}
              disabled={engineerApproveMutation.isPending}
              data-testid="button-engineer-reject"
            >
              <X className="h-4 w-4 mr-1" />
              Reddet
            </Button>
            <Button
              className="bg-green-600"
              onClick={() => submitEngineerDecision('approved')}
              disabled={engineerApproveMutation.isPending}
              data-testid="button-engineer-approve"
            >
              <Check className="h-4 w-4 mr-1" />
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Üretim Fotoğrafı</DialogTitle>
          </DialogHeader>
          {selectedOutput?.photoUrl && (
            <div className="flex justify-center">
              <img
                src={selectedOutput.photoUrl}
                alt="Üretim fotoğrafı"
                className="max-h-[70vh] rounded-lg object-contain"
                loading="lazy"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
