import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addDays, format, isSameDay, isSameMonth, isToday,
  getDay, eachDayOfInterval
} from "date-fns";
import { tr } from "date-fns/locale";

interface CalendarEvent {
  id: number;
  title: string;
  startTime: string;
  endTime: string | null;
  eventType: string;
  location: string | null;
  color: string | null;
  allDay: boolean;
}

interface Todo {
  id: number;
  title: string;
  dueDate: string | null;
  priority: string;
  status: string;
}

const EVENT_COLORS: Record<string, string> = {
  meeting: "bg-blue-500",
  reminder: "bg-amber-500",
  deadline: "bg-red-500",
  visit: "bg-green-500",
  call: "bg-purple-500",
  training: "bg-indigo-500",
  shift: "bg-teal-500",
};

const EVENT_LABELS: Record<string, string> = {
  meeting: "Toplantı",
  reminder: "Hatırlatma",
  deadline: "Son Tarih",
  visit: "Ziyaret",
  call: "Arama",
  training: "Eğitim",
  shift: "Vardiya",
};

interface CalendarViewProps {
  onDaySelect?: (date: Date) => void;
  selectedDate?: Date | null;
}

export default function CalendarView({ onDaySelect, selectedDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const selected = selectedDate || new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const rangeStart = view === "month" ? calendarStart : startOfWeek(selected, { weekStartsOn: 1 });
  const rangeEnd = view === "month" ? calendarEnd : endOfWeek(selected, { weekStartsOn: 1 });

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/ajanda/events", format(rangeStart, "yyyy-MM-dd"), format(rangeEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const res = await fetch(`/api/ajanda/events?start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`);
      if (!res.ok) throw new Error("Events fetch failed");
      return res.json();
    },
  });

  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ["/api/ajanda/todos", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/ajanda/todos?status=pending");
      if (!res.ok) throw new Error("Todos fetch failed");
      return res.json();
    },
  });

  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(e => {
      const key = format(new Date(e.startTime), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const todosByDay = useMemo(() => {
    const map = new Map<string, Todo[]>();
    todos.forEach(t => {
      if (!t.dueDate) return;
      const key = format(new Date(t.dueDate), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [todos]);

  const dayHeaders = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

  const selectedEvents = eventsByDay.get(format(selected, "yyyy-MM-dd")) || [];
  const selectedTodos = todosByDay.get(format(selected, "yyyy-MM-dd")) || [];

  return (
    <div className="flex flex-col lg:flex-row gap-4" data-testid="calendar-view">
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[160px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: tr })}
            </h3>
            <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant={view === "month" ? "default" : "ghost"} onClick={() => setView("month")} data-testid="button-view-month">Ay</Button>
            <Button size="sm" variant={view === "week" ? "default" : "ghost"} onClick={() => setView("week")} data-testid="button-view-week">Hafta</Button>
            <Button size="sm" variant="outline" onClick={() => { setCurrentMonth(new Date()); onDaySelect?.(new Date()); }} data-testid="button-today">Bugün</Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-muted rounded-md overflow-hidden">
          {dayHeaders.map(d => (
            <div key={d} className="bg-muted-foreground/5 p-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) || [];
            const dayTodos = todosByDay.get(key) || [];
            const isSelected = isSameDay(day, selected);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <button
                key={i}
                onClick={() => onDaySelect?.(day)}
                className={`
                  relative min-h-[80px] md:min-h-[100px] p-1 text-left transition-colors bg-background
                  ${!isCurrentMonth ? "opacity-40" : ""}
                  ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                  ${today ? "bg-primary/5" : ""}
                  hover-elevate
                `}
                data-testid={`calendar-day-${key}`}
              >
                <span className={`text-xs font-medium ${today ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map(e => (
                    <div key={e.id} className={`text-[10px] leading-tight truncate rounded px-1 text-white ${EVENT_COLORS[e.eventType] || "bg-blue-500"}`}>
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} daha</div>
                  )}
                  {dayTodos.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayTodos.slice(0, 3).map(t => (
                        <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${t.priority === "urgent" || t.priority === "high" ? "bg-red-500" : "bg-amber-500"}`} />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:w-80 space-y-3">
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-3">
            {format(selected, "d MMMM yyyy, EEEE", { locale: tr })}
          </h4>

          {selectedEvents.length === 0 && selectedTodos.length === 0 && (
            <p className="text-sm text-muted-foreground">Bu gün için kayıt yok</p>
          )}

          {selectedEvents.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase">Etkinlikler</p>
              {selectedEvents.map(e => (
                <div key={e.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50" data-testid={`event-item-${e.id}`}>
                  <div className={`w-1 h-8 rounded-full flex-shrink-0 ${EVENT_COLORS[e.eventType] || "bg-blue-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(e.startTime), "HH:mm")}</span>
                      {e.endTime && <span>- {format(new Date(e.endTime), "HH:mm")}</span>}
                    </div>
                    {e.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{e.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTodos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Yapılacaklar</p>
              {selectedTodos.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-sm" data-testid={`day-todo-${t.id}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-orange-500" : "bg-amber-500"}`} />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
