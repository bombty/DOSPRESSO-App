import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";

export interface DobodySuggestion {
  id: string;
  message: string;
  actionType: string;
  actionLabel: string;
  priority: string;
  icon: string;
  targetUserId?: string;
  payload?: Record<string, any>;
}

interface DobodySuggestionListProps {
  suggestions: DobodySuggestion[];
  onAction?: (suggestion: DobodySuggestion) => void;
  isPending?: boolean;
  title?: string;
}

export function DobodySuggestionList({
  suggestions,
  onAction,
  isPending = false,
  title = "Mr. Dobody",
}: DobodySuggestionListProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <Card data-testid="card-dobody-suggestions">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {suggestions.map((s) => (
          <DobodySuggestionItem
            key={s.id}
            suggestion={s}
            onAction={onAction}
            isPending={isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function DobodySuggestionItem({
  suggestion: s,
  onAction,
  isPending,
}: {
  suggestion: DobodySuggestion;
  onAction?: (suggestion: DobodySuggestion) => void;
  isPending?: boolean;
}) {
  const handleAction = () => {
    if (onAction) onAction(s);
  };

  const targetId = s.targetUserId || s.payload?.userIds?.[0];

  return (
    <div
      className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/30"
      data-testid={`suggestion-${s.id}`}
    >
      <p className="text-sm flex-1">{s.message}</p>

      {s.actionType === "send_notification" && targetId && onAction && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleAction}
          data-testid={`btn-action-${s.id}`}
        >
          {s.actionLabel}
        </Button>
      )}

      {s.actionType === "send_notification" && !targetId && s.payload?.branchId && onAction && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleAction}
          data-testid={`btn-action-${s.id}`}
        >
          {s.actionLabel}
        </Button>
      )}

      {s.actionType === "redirect" && s.payload?.route && (
        <Link href={s.payload.route}>
          <Button size="sm" variant="outline" data-testid={`btn-action-${s.id}`}>
            {s.actionLabel}
          </Button>
        </Link>
      )}

      {s.actionType === "info" && (
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {s.actionLabel}
        </Badge>
      )}

      {s.actionType === "create_task" && onAction && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleAction}
          data-testid={`btn-action-${s.id}`}
        >
          {s.actionLabel}
        </Button>
      )}
    </div>
  );
}
