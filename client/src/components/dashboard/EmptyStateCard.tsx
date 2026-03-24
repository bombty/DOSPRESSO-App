import { Card, CardContent } from "@/components/ui/card";
import { Inbox } from "lucide-react";

interface EmptyStateCardProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export default function EmptyStateCard({
  icon,
  title = "Henüz veri yok",
  description = "Bu alan veri girildikçe otomatik olarak güncellenecektir.",
  className,
}: EmptyStateCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-muted-foreground/40 mb-3">
          {icon || <Inbox className="h-10 w-10" />}
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-[280px]">{description}</p>
      </CardContent>
    </Card>
  );
}
