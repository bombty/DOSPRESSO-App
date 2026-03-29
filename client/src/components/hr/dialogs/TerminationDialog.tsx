/**
 * AddTerminationDialog — İşten çıkış kaydı
 * Extracted from ik.tsx for maintainability
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { type User, insertEmployeeTerminationSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function AddTerminationDialog({
  open,
  onOpenChange,
  employees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: User[];
}) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [terminationType, setTerminationType] = useState("resignation");
  const [terminationSubReason, setTerminationSubReason] = useState("");
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState("");
  const [totalPayment, setTotalPayment] = useState(0);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/employee-terminations", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Ayrılış kaydı oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-terminations"] });
      onOpenChange(false);
      setSelectedUserId("");
      setTerminationDate(new Date().toISOString().split('T')[0]);
      setReason("");
      setTotalPayment(0);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Ayrılış kaydı oluşturulurken hata oluştu", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !terminationDate) {
      toast({ title: "Hata", description: "Personel ve tarih zorunludur", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      userId: selectedUserId,
      terminationType,
      terminationSubReason: terminationSubReason || undefined,
      terminationDate,
      terminationReason: reason || undefined,
      totalPayment: totalPayment || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ayrılış Kaydı Ekle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Personel</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger data-testid="select-user-termination">
                <SelectValue placeholder="Personel seçin" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Ayrılık Türü</label>
            <Select value={terminationType} onValueChange={(v) => { setTerminationType(v); setTerminationSubReason(""); }}>
              <SelectTrigger data-testid="select-termination-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resignation">Istifa</SelectItem>
                <SelectItem value="termination">Fesih / Isten Cikarma</SelectItem>
                <SelectItem value="retirement">Emeklilik</SelectItem>
                <SelectItem value="mutual_agreement">Karsilikli Anlasma</SelectItem>
                <SelectItem value="contract_end">Sozlesme Sonu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Alt Neden</label>
            <Select value={terminationSubReason} onValueChange={setTerminationSubReason}>
              <SelectTrigger data-testid="select-termination-sub-reason">
                <SelectValue placeholder="Alt neden secin" />
              </SelectTrigger>
              <SelectContent>
                {terminationType === "resignation" && (
                  <>
                    <SelectItem value="resigned_voluntarily">Gonullu Istifa</SelectItem>
                    <SelectItem value="resigned_better_offer">Daha Iyi Teklif</SelectItem>
                    <SelectItem value="resigned_personal">Kisisel Nedenler</SelectItem>
                    <SelectItem value="resigned_relocation">Tasinma</SelectItem>
                    <SelectItem value="resigned_health">Saglik Nedenleri</SelectItem>
                  </>
                )}
                {terminationType === "termination" && (
                  <>
                    <SelectItem value="fired_performance">Performans Yetersizligi</SelectItem>
                    <SelectItem value="fired_misconduct">Disiplin Ihlali</SelectItem>
                    <SelectItem value="fired_restructuring">Yapisal Degisiklik</SelectItem>
                    <SelectItem value="fired_probation">Deneme Süresi Başarısız</SelectItem>
                    <SelectItem value="fired_attendance">Devamsizlik</SelectItem>
                  </>
                )}
                {terminationType === "mutual_agreement" && (
                  <>
                    <SelectItem value="mutual_downsizing">Kadro Daraltma</SelectItem>
                    <SelectItem value="mutual_restructuring">Yeniden Yapilanma</SelectItem>
                    <SelectItem value="mutual_other">Diger</SelectItem>
                  </>
                )}
                {(terminationType === "retirement" || terminationType === "contract_end") && (
                  <>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="other">Diger</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Ayrılık Tarihi</label>
            <Input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} data-testid="input-termination-date" />
          </div>
          <div>
            <label className="text-sm font-medium">Ayrılık Nedeni (Açık Metin)</label>
            <Textarea placeholder="Ayrılık ile ilgili detayları yazın..." value={reason} onChange={(e) => setReason(e.target.value)} className="resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium">Toplam Ödeme (₺) (Opsiyonel)</label>
            <Input type="number" min="0" value={totalPayment} onChange={(e) => setTotalPayment(parseInt(e.target.value) || 0)} data-testid="input-payment" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto" data-testid="button-submit-termination">
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
