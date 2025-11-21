import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus } from "lucide-react";

interface OnboardingTaskDialogProps {
  onboardingId: number;
  userId: string;
}

export function OnboardingTaskDialog({ onboardingId, userId }: OnboardingTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    taskType: "",
    taskName: "",
    description: "",
    dueDate: "",
    priority: "medium",
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/onboarding-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Görev oluşturulamadı");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-tasks", onboardingId] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding", userId] });
      setOpen(false);
      setFormData({
        taskType: "",
        taskName: "",
        description: "",
        dueDate: "",
        priority: "medium",
      });
      toast({
        title: "Görev oluşturuldu",
        description: "Onboarding görevi başarıyla eklendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Görev oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.taskType || !formData.taskName) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen görev türü ve adını girin",
        variant: "destructive",
      });
      return;
    }

    createTaskMutation.mutate({
      onboardingId,
      ...formData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-create-onboarding-task">
          <Plus className="h-4 w-4 mr-2" />
          Görev Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" data-testid="dialog-create-onboarding-task">
        <DialogHeader>
          <DialogTitle>Yeni Onboarding Görevi</DialogTitle>
          <DialogDescription>
            Onboarding süreci için yeni görev ekleyin
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="taskType">Görev Türü *</Label>
            <Select value={formData.taskType} onValueChange={(value) => setFormData({ ...formData, taskType: value })}>
              <SelectTrigger id="taskType" data-testid="select-task-type">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document_upload">Belge Yükle</SelectItem>
                <SelectItem value="training">Eğitim</SelectItem>
                <SelectItem value="orientation">Oryantasyon</SelectItem>
                <SelectItem value="system_access">Sistem Erişimi</SelectItem>
                <SelectItem value="meet_team">Takımla Tanışma</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="taskName">Görev Adı *</Label>
            <Input
              id="taskName"
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
              placeholder="Örn: İş sözleşmesi imzala"
              data-testid="input-task-name"
            />
          </div>
          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Görev detaylarını yazın"
              rows={3}
              data-testid="textarea-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Bitiş Tarihi</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                data-testid="input-due-date"
              />
            </div>
            <div>
              <Label htmlFor="priority">Öncelik</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger id="priority" data-testid="select-priority">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Düşük</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={createTaskMutation.isPending} data-testid="button-submit">
            Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
