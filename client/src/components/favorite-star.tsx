import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites, type FavoritePage } from "@/hooks/use-favorites";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FavoriteStarProps {
  page: FavoritePage;
}

export function FavoriteStar({ page }: FavoriteStarProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(page.path);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(page);
          }}
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
