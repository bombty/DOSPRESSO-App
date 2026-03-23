import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface NewEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

export default function NewEventDialog({ open, onOpenChange, defaultDate }: NewEventDialogProps) {
  const { toast } = useToast();
  const now = defaultDate || new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(dateStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [eventType, setEventType] = useState("meeting");
  const [location, setLocation] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState(30);

  const createMutation = useMutation({
    mutationFn: async () => {
      const startDateTime = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`;
      const endDateTime = allDay ? undefined : `${startDate}T${endTime}:00`;
      const res = await fetch("/api/ajanda/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          allDay,
          eventType,
          location: location || undefined,
          reminderMinutes,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ajanda/events"] });
      toast({ title: "Etkinlik oluşturuldu" });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Etkinlik oluşturulamadı", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartTime("09:00");
    setEndTime("10:00");
    setAllDay(false);
    setEventType("meeting");
    setLocation("");
    setReminderMinutes(30);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Etkinlik</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="event-title">Başlık</Label>
            <Input
              id="event-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Etkinlik adı"
              required
              data-testid="input-event-title"
            />
          </div>

          <div className="space-y-2">
            <Label>Tür</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger data-testid="select-event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Toplantı</SelectItem>
                <SelectItem value="reminder">Hatırlatma</SelectItem>
                <SelectItem value="deadline">Son Tarih</SelectItem>
                <SelectItem value="visit">Ziyaret</SelectItem>
                <SelectItem value="call">Arama</SelectItem>
                <SelectItem value="training">Eğitim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-date">Tarih</Label>
            <Input
              id="event-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
              data-testid="input-event-date"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="all-day"
              checked={allDay}
              onCheckedChange={v => setAllDay(!!v)}
              data-testid="checkbox-all-day"
            />
            <Label htmlFor="all-day" className="text-sm">Tüm gün</Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="event-start">Başlangıç</Label>
                <Input
                  id="event-start"
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  data-testid="input-event-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">Bitiş</Label>
                <Input
                  id="event-end"
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  data-testid="input-event-end-time"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="event-location">Konum</Label>
            <Input
              id="event-location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Nerede?"
              data-testid="input-event-location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-desc">Açıklama</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detaylar..."
              rows={2}
              data-testid="input-event-description"
            />
          </div>

          <div className="space-y-2">
            <Label>Hatırlatma</Label>
            <Select value={String(reminderMinutes)} onValueChange={v => setReminderMinutes(Number(v))}>
              <SelectTrigger data-testid="select-reminder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Yok</SelectItem>
                <SelectItem value="5">5 dakika önce</SelectItem>
                <SelectItem value="15">15 dakika önce</SelectItem>
                <SelectItem value="30">30 dakika önce</SelectItem>
                <SelectItem value="60">1 saat önce</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-event">
              İptal
            </Button>
            <Button type="submit" disabled={!title.trim() || createMutation.isPending} data-testid="button-save-event">
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
