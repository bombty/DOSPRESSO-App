import { useState, useEffect } from "react";
import { Search, Command } from "lucide-react";
import { GlobalSearchModal } from "@/components/global-search-modal";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-md border bg-background hover-elevate"
        data-testid="button-global-search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Ara...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <GlobalSearchModal open={open} onOpenChange={setOpen} />
    </>
  );
}
