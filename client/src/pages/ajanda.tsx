import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, CheckSquare, StickyNote, Plus } from "lucide-react";
import CalendarView from "@/components/ajanda/CalendarView";
import TodoList from "@/components/ajanda/TodoList";
import NotesGrid from "@/components/ajanda/NotesGrid";
import BriefingBanner from "@/components/ajanda/BriefingBanner";
import NewTodoDialog from "@/components/ajanda/NewTodoDialog";
import NewEventDialog from "@/components/ajanda/NewEventDialog";
import NewNoteDialog from "@/components/ajanda/NewNoteDialog";

type ViewMode = "calendar" | "todos" | "notes";

interface NoteForEdit {
  id: number;
  title: string | null;
  content: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  relatedEntityName: string | null;
  tags: string[] | null;
  isPinned: boolean;
  color: string | null;
}

export default function AjandaPage() {
  const [view, setView] = useState<ViewMode>("calendar");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showNewTodo, setShowNewTodo] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [editNote, setEditNote] = useState<NoteForEdit | null>(null);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4" data-testid="ajanda-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Ajanda</h1>
          <div className="flex items-center gap-1 ml-2">
            {[
              { key: "calendar" as ViewMode, label: "Takvim", icon: Calendar },
              { key: "todos" as ViewMode, label: "Todo", icon: CheckSquare },
              { key: "notes" as ViewMode, label: "Notlar", icon: StickyNote },
            ].map(v => (
              <Button
                key={v.key}
                size="sm"
                variant={view === v.key ? "default" : "ghost"}
                onClick={() => setView(v.key)}
                className="gap-1.5"
                data-testid={`button-view-${v.key}`}
              >
                <v.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{v.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-1.5" data-testid="button-new-item">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowNewTodo(true)} data-testid="menu-new-todo">
              <CheckSquare className="h-4 w-4 mr-2" />
              Yapılacak
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowNewEvent(true)} data-testid="menu-new-event">
              <Calendar className="h-4 w-4 mr-2" />
              Etkinlik
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditNote(null); setShowNewNote(true); }} data-testid="menu-new-note">
              <StickyNote className="h-4 w-4 mr-2" />
              Not
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <BriefingBanner />

      {view === "calendar" && (
        <CalendarView
          selectedDate={selectedDate}
          onDaySelect={setSelectedDate}
        />
      )}

      {view === "todos" && (
        <TodoList onNewTodo={() => setShowNewTodo(true)} />
      )}

      {view === "notes" && (
        <NotesGrid
          onNewNote={() => { setEditNote(null); setShowNewNote(true); }}
          onEditNote={(note) => { setEditNote(note); setShowNewNote(true); }}
        />
      )}

      <NewTodoDialog open={showNewTodo} onOpenChange={setShowNewTodo} />
      <NewEventDialog open={showNewEvent} onOpenChange={setShowNewEvent} defaultDate={selectedDate} />
      <NewNoteDialog open={showNewNote} onOpenChange={setShowNewNote} editNote={editNote} />
    </div>
  );
}
