import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEPARTMENTS, PRIORITIES, isHQRole } from "./categoryConfig";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, Paperclip, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EquipmentItem {
  id: number;
  name: string;
  brand?: string | null;
  model?: string | null;
}

export function NewTicketDialog({ open, onOpenChange }: NewTicketDialogProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isHQ = isHQRole(user?.role ?? "");

  const [dept, setDept] = useState("");
  const [priority, setPriority] = useState("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [equipmentOther, setEquipmentOther] = useState("");
  const [showEquipmentOther, setShowEquipmentOther] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: equipmentList = [] } = useQuery<EquipmentItem[]>({
    queryKey: ['/api/equipment', user?.branchId],
    queryFn: async () => {
      const res = await fetch(`/api/equipment?branchId=${user?.branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: dept === 'teknik' && !isHQ && !!user?.branchId,
  });

  const selectedDept = DEPARTMENTS.find(d => d.key === dept);

  async function uploadPhotos(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    const failed: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/iletisim/tickets/temp-upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          urls.push(data.url);
        } else {
          failed.push(file.name);
        }
      } catch {
        failed.push(file.name);
      }
    }
    if (failed.length > 0) {
      throw new Error(`Yuklenemedi: ${failed.join(', ')}`);
    }
    return urls;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      try {
        const photoUrls = photos.length > 0 ? await uploadPhotos(photos) : [];

        const payload: Record<string, any> = {
          department: dept,
          title: title.trim(),
          description: description.trim(),
          priority,
        };

        if (dept === 'teknik' && !isHQ) {
          if (selectedEquipmentId) {
            payload.relatedEquipmentId = selectedEquipmentId;
          }
          if (showEquipmentOther && equipmentOther.trim()) {
            payload.equipmentDescription = equipmentOther.trim();
          }
        }

        if (photoUrls.length > 0) {
          payload.attachmentUrls = photoUrls;
        }

        return apiRequest("POST", "/api/iletisim/tickets", payload);
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/iletisim/tickets"] });
      qc.invalidateQueries({ queryKey: ["/api/iletisim/dashboard"] });
      onOpenChange(false);
      resetForm();
    },
  });

  function resetForm() {
    setDept("");
    setPriority("normal");
    setTitle("");
    setDescription("");
    setSelectedEquipmentId(null);
    setEquipmentOther("");
    setShowEquipmentOther(false);
    setPhotos([]);
  }

  const canSubmit = dept && title.trim().length >= 5 && description.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="new-ticket-dialog">
        <DialogHeader>
          <DialogTitle>Yeni Destek Talebi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground">Departman Secin</p>
            <div className="grid grid-cols-3 gap-2">
              {DEPARTMENTS.map(d => {
                const DIcon = d.icon;
                return (
                  <button
                    key={d.key}
                    onClick={() => {
                      setDept(d.key);
                      if (d.key !== 'teknik') {
                        setSelectedEquipmentId(null);
                        setEquipmentOther("");
                        setShowEquipmentOther(false);
                      }
                    }}
                    className={cn(
                      "p-3 rounded-md border text-left transition-all",
                      dept === d.key
                        ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                        : "border-border bg-muted/30 hover-elevate"
                    )}
                    data-testid={`dept-btn-${d.key}`}
                  >
                    <DIcon className="h-4 w-4 mb-1 text-muted-foreground" />
                    <div className="text-[11px] font-medium leading-tight">{d.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDept && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800" data-testid="auto-assign-info">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="text-xs text-green-700 dark:text-green-300">
                <span className="font-medium">Otomatik yonlendirilecek</span> · SLA: {selectedDept.slaLabel}
              </div>
            </div>
          )}

          {dept === 'teknik' && !isHQ && (
            <div className="space-y-2" data-testid="equipment-selection">
              <p className="text-xs font-medium text-muted-foreground">Cihaz / Ekipman</p>
              <select
                value={showEquipmentOther ? 'other' : (selectedEquipmentId ?? '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'other') {
                    setSelectedEquipmentId(null);
                    setShowEquipmentOther(true);
                  } else if (val === '') {
                    setSelectedEquipmentId(null);
                    setShowEquipmentOther(false);
                  } else {
                    setSelectedEquipmentId(parseInt(val));
                    setShowEquipmentOther(false);
                    setEquipmentOther("");
                  }
                }}
                className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background text-foreground"
                data-testid="select-equipment"
              >
                <option value="">Cihaz secin...</option>
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} {eq.brand ? `(${eq.brand})` : ''} {eq.model ? `- ${eq.model}` : ''}
                  </option>
                ))}
                <option value="other">Listede yok / Diger</option>
              </select>

              {showEquipmentOther && (
                <Input
                  placeholder="Cihazi aciklayin..."
                  value={equipmentOther}
                  onChange={(e) => setEquipmentOther(e.target.value)}
                  className="text-sm"
                  data-testid="input-equipment-other"
                />
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Konu Basligi</p>
            <Input
              placeholder="Kisaca aciklayin..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-sm"
              data-testid="ticket-title-input"
            />
          </div>

          <div>
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Detay</p>
            <Textarea
              placeholder="Sorunu detayli aciklayin..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="text-sm resize-none"
              rows={4}
              data-testid="ticket-desc-input"
            />
          </div>

          <div>
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Oncelik</p>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={priority === p.key ? "default" : "outline"}
                  onClick={() => setPriority(p.key)}
                  className="flex-1 toggle-elevate"
                  data-testid={`priority-btn-${p.key}`}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div data-testid="photo-upload-section">
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Fotograf Ekle (opsiyonel)</p>
            <div
              className="border-2 border-dashed border-border rounded-md p-3 text-center cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="photo-upload-area"
            >
              {photos.length === 0 ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                  <Paperclip className="w-4 h-4" />
                  <span>Fotograf eklemek icin tiklayin</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 justify-center">
                  {photos.map((f, i) => (
                    <div key={i} className="relative" data-testid={`photo-preview-${i}`}>
                      <img
                        src={URL.createObjectURL(f)}
                        className="w-16 h-16 object-cover rounded-md border border-border"
                        alt={f.name}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotos(prev => prev.filter((_, j) => j !== i));
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center"
                        data-testid={`remove-photo-${i}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <div className="w-16 h-16 border-2 border-dashed border-border rounded-md flex items-center justify-center text-muted-foreground text-xl">
                      +
                    </div>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setPhotos(prev => [...prev, ...files].slice(0, 5));
                e.target.value = '';
              }}
              data-testid="input-photo-file"
            />
            {photos.length > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">{photos.length} fotograf secildi (maks. 5)</div>
            )}
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending || isUploading}
            className="w-full"
            data-testid="submit-ticket-btn"
          >
            {mutation.isPending || isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isUploading ? "Fotograflar yukleniyor..." : "Gonderiliyor..."}
              </span>
            ) : "Ticket Ac"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
