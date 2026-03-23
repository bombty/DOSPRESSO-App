import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEPARTMENTS, PRIORITIES, isHQRole } from "./categoryConfig";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, Paperclip, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel?: "franchise" | "misafir";
}

interface EquipmentItem {
  id: number;
  name: string;
  brand?: string | null;
  model?: string | null;
}

interface TicketCreatePayload {
  department: string;
  title: string;
  description: string;
  priority: string;
  relatedEquipmentId?: number;
  equipmentDescription?: string;
  attachmentUrls?: string[];
  channel?: string;
  ticketType?: string;
  source?: string;
  rating?: number;
  ratingHizmet?: number;
  ratingTemizlik?: number;
  ratingUrun?: number;
  ratingPersonel?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground min-w-[80px]">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="p-0.5"
            data-testid={`star-${label}-${s}`}
          >
            <Star className={cn("h-5 w-5 transition-colors", s <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function NewTicketDialog({ open, onOpenChange, channel }: NewTicketDialogProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isHQ = isHQRole(user?.role ?? "");
  const isMisafir = channel === "misafir";

  const [dept, setDept] = useState(isMisafir ? "musteri_hizmetleri" : "");
  const [priority, setPriority] = useState("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [equipmentOther, setEquipmentOther] = useState("");
  const [showEquipmentOther, setShowEquipmentOther] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ratingHizmet, setRatingHizmet] = useState(0);
  const [ratingTemizlik, setRatingTemizlik] = useState(0);
  const [ratingUrun, setRatingUrun] = useState(0);
  const [ratingPersonel, setRatingPersonel] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [branchId, setBranchId] = useState<number | undefined>(undefined);

  const { data: branchList = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/branches'],
    enabled: isMisafir && isHQ,
  });

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

        const payload: TicketCreatePayload = {
          department: dept,
          title: title.trim(),
          description: description.trim(),
          priority,
        };

        if (isMisafir) {
          payload.channel = 'misafir';
          payload.ticketType = 'musteri_geri_bildirim';
          payload.source = 'manual';
          if (branchId) payload.relatedEquipmentId = undefined;
          const avgRating = Math.round(([ratingHizmet, ratingTemizlik, ratingUrun, ratingPersonel].filter(r => r > 0).reduce((a, b) => a + b, 0)) / Math.max(1, [ratingHizmet, ratingTemizlik, ratingUrun, ratingPersonel].filter(r => r > 0).length));
          if (avgRating > 0) payload.rating = avgRating;
          if (ratingHizmet > 0) payload.ratingHizmet = ratingHizmet;
          if (ratingTemizlik > 0) payload.ratingTemizlik = ratingTemizlik;
          if (ratingUrun > 0) payload.ratingUrun = ratingUrun;
          if (ratingPersonel > 0) payload.ratingPersonel = ratingPersonel;
          if (customerName.trim()) payload.customerName = customerName.trim();
          if (customerEmail.trim()) payload.customerEmail = customerEmail.trim();
          if (customerPhone.trim()) payload.customerPhone = customerPhone.trim();
        }

        if (dept === 'teknik' && !isHQ && !isMisafir) {
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

        const body = { ...payload };
        if (isMisafir && branchId) {
          (body as any).branchId = branchId;
        }

        return apiRequest("POST", "/api/iletisim/tickets", body);
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
    setDept(isMisafir ? "musteri_hizmetleri" : "");
    setPriority("normal");
    setTitle("");
    setDescription("");
    setSelectedEquipmentId(null);
    setEquipmentOther("");
    setShowEquipmentOther(false);
    setPhotos([]);
    setRatingHizmet(0);
    setRatingTemizlik(0);
    setRatingUrun(0);
    setRatingPersonel(0);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setBranchId(undefined);
  }

  const canSubmit = dept && title.trim().length >= 5 && description.trim().length >= 10
    && (!isMisafir || (isMisafir && (branchId || !isHQ)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="new-ticket-dialog">
        <DialogHeader>
          <DialogTitle>{isMisafir ? "Yeni Misafir Geri Bildirimi" : "Yeni Destek Talebi"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isMisafir && isHQ && (
            <div>
              <p className="text-xs font-medium mb-1.5 text-muted-foreground">Sube</p>
              <select
                value={branchId ?? ''}
                onChange={(e) => setBranchId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background text-foreground"
                data-testid="select-branch-misafir"
              >
                <option value="">Sube secin...</option>
                {branchList.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {isMisafir && (
            <div className="space-y-2 p-3 rounded-md border border-border bg-muted/30" data-testid="rating-section">
              <p className="text-xs font-medium text-muted-foreground mb-1">Puanlama</p>
              <StarRating value={ratingHizmet} onChange={setRatingHizmet} label="Hizmet" />
              <StarRating value={ratingTemizlik} onChange={setRatingTemizlik} label="Temizlik" />
              <StarRating value={ratingUrun} onChange={setRatingUrun} label="Urun" />
              <StarRating value={ratingPersonel} onChange={setRatingPersonel} label="Personel" />
            </div>
          )}

          {isMisafir && (
            <div className="space-y-2" data-testid="customer-info-section">
              <p className="text-xs font-medium text-muted-foreground">Musteri Bilgileri (opsiyonel)</p>
              <Input placeholder="Ad Soyad" value={customerName} onChange={e => setCustomerName(e.target.value)} className="text-sm" data-testid="input-customer-name" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Telefon" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="text-sm" data-testid="input-customer-phone" />
                <Input placeholder="E-posta" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="text-sm" data-testid="input-customer-email" />
              </div>
            </div>
          )}

          {!isMisafir && (
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
                      <div className="text-xs font-medium leading-tight">{d.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!isMisafir && selectedDept && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800" data-testid="auto-assign-info">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="text-xs text-green-700 dark:text-green-300">
                <span className="font-medium">Otomatik yonlendirilecek</span> · SLA: {selectedDept.slaLabel}
              </div>
            </div>
          )}

          {!isMisafir && dept === 'teknik' && !isHQ && (
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
              <div className="text-xs text-muted-foreground mt-1">{photos.length} fotograf secildi (maks. 5)</div>
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
