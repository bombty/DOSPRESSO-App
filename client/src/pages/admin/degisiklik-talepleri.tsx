import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { FileEdit, Check, X } from "lucide-react";
import type { DataChangeRequest } from "@shared/schema";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
  pending: { label: "Beklemede", variant: "outline" },
  approved: { label: "Onaylandı", variant: "default" },
  rejected: { label: "Reddedildi", variant: "destructive" },
};

export default function AdminDegisiklikTalepleri() {
  const { toast } = useToast();
  const [rejectDialog, setRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DataChangeRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: requests = [], isLoading } = useQuery<DataChangeRequest[]>({
    queryKey: ["/api/change-requests"],
  });

  const reviewMutation = useMutation({
    mutationFn: (data: { id: number; status: string; reviewNote?: string }) =>
      apiRequest("PATCH", `/api/admin/change-requests/${data.id}`, {
        status: data.status,
        reviewNote: data.reviewNote,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-requests"] });
      setRejectDialog(false);
      setReviewNote("");
      toast({ title: "Talep güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep güncellenemedi", variant: "destructive" });
    },
  });

  const handleApprove = (req: DataChangeRequest) => {
    reviewMutation.mutate({ id: req.id, status: "approved" });
  };

  const handleRejectClick = (req: DataChangeRequest) => {
    setSelectedRequest(req);
    setReviewNote("");
    setRejectDialog(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedRequest) return;
    reviewMutation.mutate({
      id: selectedRequest.id,
      status: "rejected",
      reviewNote: reviewNote || undefined,
    });
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <FileEdit className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Değişiklik Talepleri</h1>
        </div>
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileEdit className="h-5 w-5" />
        <div>
          <h1 className="text-lg font-semibold">Değişiklik Talepleri</h1>
          <p className="text-xs text-muted-foreground">
            {requests.filter((r) => r.status === "pending").length} bekleyen talep
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tablo</TableHead>
                <TableHead>Alan</TableHead>
                <TableHead>Mevcut → Talep</TableHead>
                <TableHead>Sebep</TableHead>
                <TableHead>Talep Eden</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-24">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Henüz değişiklik talebi yok
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => {
                  const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.pending;
                  return (
                    <TableRow key={req.id} data-testid={`row-request-${req.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`text-id-${req.id}`}>
                        #{req.id}
                      </TableCell>
                      <TableCell data-testid={`text-table-${req.id}`}>{req.tableName}</TableCell>
                      <TableCell data-testid={`text-field-${req.id}`}>{req.fieldName}</TableCell>
                      <TableCell className="max-w-[180px]" data-testid={`text-values-${req.id}`}>
                        <span className="text-muted-foreground">{req.currentValue || "-"}</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium">{req.requestedValue || "-"}</span>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm" data-testid={`text-reason-${req.id}`}>
                        {req.reason}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground" data-testid={`text-requester-${req.id}`}>
                        {req.requestedBy || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground" data-testid={`text-date-${req.id}`}>
                        {formatDate(req.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} data-testid={`badge-status-${req.id}`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApprove(req)}
                              disabled={reviewMutation.isPending}
                              data-testid={`button-approve-${req.id}`}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRejectClick(req)}
                              disabled={reviewMutation.isPending}
                              data-testid={`button-reject-${req.id}`}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Talebi Reddet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>#{selectedRequest?.id}</strong> numaralı talebi reddetmek istediğinize emin misiniz?
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reviewNote">Red Notu (opsiyonel)</Label>
              <Textarea
                id="reviewNote"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Red sebebini yazabilirsiniz..."
                rows={3}
                data-testid="textarea-review-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)} data-testid="button-cancel-reject">
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={reviewMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {reviewMutation.isPending ? "Reddediliyor..." : "Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
