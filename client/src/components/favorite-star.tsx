import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites, type FavoritePage } from "@/hooks/use-favorites";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface FavoriteStarProps {
  page: FavoritePage;
}

export function FavoriteStar({ page }: FavoriteStarProps) {
  const { isFavorite, toggleFavorite, maxFavorites } = useFavorites();
  const { toast } = useToast();
  const active = isFavorite(page.path);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleFavorite(page);
    if (result.reachedMax) {
      toast({
        title: "Favori limiti",
        description: `En fazla ${maxFavorites} favori ekleyebilirsiniz. Yeni eklemek için mevcut bir favoriyi kaldırın.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          data-testid={`button-favorite-${page.path.replace(/\//g, '-')}`}
        >
          <Star
            className={`h-4 w-4 transition-colors ${
              active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            }`}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {active ? "Favorilerden kaldır" : "Favorilere ekle"}
      </TooltipContent>
    </Tooltip>
  );
}
