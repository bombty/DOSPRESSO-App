import { Construction } from "lucide-react";

export default function PlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <Construction className="h-12 w-12 text-muted-foreground/40" />
      <h2 className="text-xl font-semibold">Yakında Geliyor</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Bu bölüm pilot sonrası aktif edilecektir.
      </p>
    </div>
  );
}
