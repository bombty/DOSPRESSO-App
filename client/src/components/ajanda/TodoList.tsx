import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ExternalLink, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Todo {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueTime: string | null;
  priority: string;
  status: string;
  source: string;
  sourceId: string | null;
  sourceUrl: string | null;
  tags: string[] | null;
  completedAt: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-700 dark:text-red-400",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  low: "bg-green-500/10 text-green-700 dark:text-green-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Acil",
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

const SOURCE_COLORS: Record<string, string> = {
  manual: "bg-muted text-muted-foreground",
  crm_ticket: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  equipment: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  dobody: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  branch_task: "bg-green-500/10 text-green-700 dark:text-green-400",
  system: "bg-muted text-muted-foreground",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manuel",
  crm_ticket: "CRM",
  equipment: "Ekipman",
  dobody: "Dobody",
  branch_task: "Görev",
  system: "Sistem",
};

interface TodoListProps {
  onNewTodo?: () => void;
}

export default function TodoList({ onNewTodo }: TodoListProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [quickTitle, setQuickTitle] = useState("");

  const queryParams = new URLSearchParams();
  if (filter === "overdue") queryParams.set("due", "overdue");
  else if (filter === "today") queryParams.set("due", "today");
  else if (filter === "week") queryParams.set("due", "week");

  if (filter !== "done") queryParams.set("status", filter === "all" ? "all" : "pending");
  else queryParams.set("status", "done");

  if (sourceFilter !== "all") queryParams.set("source", sourceFilter);

  const { data: todos = [], isLoading } = useQuery<Todo[]>({
    queryKey: ["/api/ajanda/todos", filter, sourceFilter],
    queryFn: async () => {
      const res = await fetch(`/api/ajanda/todos?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/ajanda/todos/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Complete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ajanda/todos"] });
    },
  });

  const quickAddMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/ajanda/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      setQuickTitle("");
      queryClient.invalidateQueries({ queryKey: ["/api/ajanda/todos"] });
      toast({ title: "Todo eklendi" });
    },
  });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    quickAddMutation.mutate(quickTitle.trim());
  };

  const pendingTodos = todos.filter(t => t.status !== "done");
  const doneTodos = todos.filter(t => t.status === "done");
  const displayTodos = filter === "done" ? doneTodos : pendingTodos;

  const grouped = {
    urgent: displayTodos.filter(t => t.priority === "urgent"),
    high: displayTodos.filter(t => t.priority === "high"),
    medium: displayTodos.filter(t => t.priority === "medium"),
    low: displayTodos.filter(t => t.priority === "low"),
  };

  return (
    <div className="space-y-4" data-testid="todo-list">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { key: "all", label: "Tümü" },
            { key: "today", label: "Bugün" },
            { key: "week", label: "Bu Hafta" },
            { key: "overdue", label: "Gecikmiş" },
            { key: "done", label: "Tamamlanan" },
          ].map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "ghost"}
              onClick={() => setFilter(f.key)}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-source-filter">
            <SelectValue placeholder="Kaynak" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kaynaklar</SelectItem>
            <SelectItem value="manual">Manuel</SelectItem>
            <SelectItem value="crm_ticket">CRM</SelectItem>
            <SelectItem value="equipment">Ekipman</SelectItem>
            <SelectItem value="dobody">Dobody</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
        <Input
          placeholder="Hızlı todo ekle..."
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          data-testid="input-quick-todo"
        />
        <Button type="submit" size="icon" disabled={!quickTitle.trim() || quickAddMutation.isPending} data-testid="button-quick-add">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : displayTodos.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Yapılacak bir şey yok</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {(["urgent", "high", "medium", "low"] as const).map(priority => {
            const items = grouped[priority];
            if (items.length === 0) return null;
            return (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className={PRIORITY_COLORS[priority]}>
                    {PRIORITY_LABELS[priority]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-1">
                  {items.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onComplete={() => completeMutation.mutate(todo.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TodoItem({ todo, onComplete }: { todo: Todo; onComplete: () => void }) {
  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status !== "done";

  return (
    <Card className={`p-3 flex items-start gap-3 ${todo.status === "done" ? "opacity-60" : ""}`} data-testid={`todo-item-${todo.id}`}>
      <Checkbox
        checked={todo.status === "done"}
        onCheckedChange={onComplete}
        className="mt-0.5"
        data-testid={`checkbox-todo-${todo.id}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${todo.status === "done" ? "line-through" : ""}`}>
            {todo.title}
          </span>
          {todo.source !== "manual" && (
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${SOURCE_COLORS[todo.source] || ""}`}>
              {SOURCE_LABELS[todo.source] || todo.source}
            </Badge>
          )}
        </div>
        {todo.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{todo.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {todo.dueDate && (
            <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              <Calendar className="h-3 w-3" />
              {format(new Date(todo.dueDate), "d MMM", { locale: tr })}
              {todo.dueTime && ` ${todo.dueTime}`}
            </span>
          )}
          {todo.tags && todo.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {todo.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          )}
          {todo.sourceUrl && (
            <a href={todo.sourceUrl} className="text-xs text-primary flex items-center gap-0.5 hover:underline" data-testid={`link-source-${todo.id}`}>
              <ExternalLink className="h-3 w-3" />
              Kaynağa git
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
