import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { 
  ClipboardCheck, 
  Check, 
  X, 
  Clock, 
  User,
  Package,
  AlertTriangle,
  Eye,
  Camera,
  RefreshCw,
  Factory,
  Trash2,
  Ruler,
  CheckSquare,
  FileText,
  Image as ImageIcon
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

export default function FabrikaKaliteKontrol() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedOutput, setSelectedOutput] = useState<ProductionOutput | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [criteriaChecks, setCriteriaChecks] = useState<CriteriaCheck[]>([]);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  const { data: pendingOutputs = [], isLoading: loadingPending, refetch: refetchPending } = useQuery<ProductionOutput[]>({
    queryKey: ['/api/factory/quality/pending'],
  });

  const { data: approvedOutputs = [], isLoading: loadingApproved } = useQuery<ProductionOutput[]>({
    queryKey: ['/api/factory/quality/approved'],
  });

  const { data: rejectedOutputs = [], isLoading: loadingRejected } = useQuery<ProductionOutput[]>({
    queryKey: ['/api/factory/quality/rejected'],
  });

  const { data: qualitySpecs = [] } = useQuery<QualitySpec[]>({
    queryKey: ['/api/factory/quality-specs/station', selectedOutput?.stationId],
    enabled: !!selectedOutput?.stationId && reviewDialogOpen,
  });

  useEffect(() => {
    if (qualitySpecs.length > 0 && reviewDialogOpen) {
      setCriteriaChecks(qualitySpecs.map(spec => ({
        specId: spec.id,
        checked: false,
        value: '',
        notes: ''
      })));
    }
  }, [qualitySpecs, reviewDialogOpen]);

  const reviewMutation = useMutation({
    mutationFn: async (data: { outputId: number; decision: 'approved' | 'rejected'; reason?: string }) => {
      const res = await apiRequest('POST', '/api/factory/quality/review', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kalite kontrolü kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/quality/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/quality/approved'] });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/quality/rejected'] });
      setReviewDialogOpen(false);
      setSelectedOutput(null);
      setDecisionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleReview = (output: ProductionOutput) => {
    setSelectedOutput(output);
    setDecisionReason("");
    setReviewDialogOpen(true);
  };

  const submitReview = (decision: 'approved' | 'rejected') => {
    if (!selectedOutput) return;
    reviewMutation.mutate({
      outputId: selectedOutput.id,
      decision,
      reason: decisionReason || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600"><Check className="h-3 w-3 mr-1" />Onaylandı</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Reddedildi</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Bekliyor</Badge>;
    }
  };

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
                  onClick={() => handleReview(output)}
                  data-testid={`button-review-${output.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
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
        <Button variant="outline" onClick={() => refetchPending()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <TabsList className="mb-4">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Bekleyen ({pendingOutputs.length})
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

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-500" />
              Kalite Kontrolü
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
                        Fotoğraf Gör
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

                {qualitySpecs.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-amber-500" />
                      <Label className="text-base font-semibold">Kalite Kriterleri</Label>
                      <Badge variant="outline" className="ml-auto">
                        {criteriaChecks.filter(c => c.checked).length}/{qualitySpecs.length} kontrol edildi
                      </Badge>
                    </div>
                    <div className="space-y-2 border rounded-lg p-3">
                      {qualitySpecs.map((spec, idx) => {
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
                                      className="w-32 h-8"
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
                  <Label>Açıklama (Opsiyonel)</Label>
                  <Textarea
                    placeholder="Kalite değerlendirmesi hakkında not..."
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    rows={3}
                    data-testid="input-decision-reason"
                  />
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              data-testid="button-cancel-review"
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitReview('rejected')}
              disabled={reviewMutation.isPending}
              data-testid="button-reject"
            >
              <X className="h-4 w-4 mr-1" />
              Reddet
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => submitReview('approved')}
              disabled={reviewMutation.isPending}
              data-testid="button-approve"
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
