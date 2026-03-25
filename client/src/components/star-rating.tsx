import { Star, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StarRatingProps {
  value: number;
  maxValue?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  maxRating?: number;
  penaltyApplied?: boolean;
  className?: string;
}

export function StarRating({
  value,
  maxValue = 5,
  onChange,
  readonly = false,
  size = "md",
  showValue = false,
  maxRating = 5,
  penaltyApplied = false,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (starValue: number) => {
    if (readonly || !onChange) return;
    if (starValue > maxRating) return;
    onChange(starValue);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxValue }, (_, i) => i + 1).map((starValue) => {
        const isFilled = starValue <= value;
        const isDisabled = starValue > maxRating;
        const isClickable = !readonly && onChange && !isDisabled;

        const star = (
          <button
            key={starValue}
            type="button"
            onClick={() => handleClick(starValue)}
            disabled={readonly || isDisabled}
            className={cn(
              "focus:outline-none transition-colors",
              isClickable && "cursor-pointer hover:scale-110",
              readonly && "cursor-default",
              isDisabled && "cursor-not-allowed opacity-40"
            )}
            data-testid={`star-rating-${starValue}`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground",
                isDisabled && "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        );

        if (isDisabled && !readonly) {
          return (
            <Tooltip key={starValue}>
              <TooltipTrigger asChild>
                <span 
                  className="inline-flex cursor-not-allowed opacity-40"
                  onClick={(e) => e.preventDefault()}
                  data-testid={`star-rating-disabled-${starValue}`}
                >
                  <Star
                    className={cn(
                      sizeClasses[size],
                      "fill-transparent text-muted-foreground/40"
                    )}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Geç teslim nedeniyle en fazla {maxRating} yıldız verilebilir</p>
              </TooltipContent>
            </Tooltip>
          );
        }

        return star;
      })}
      
      {showValue && (
        <span className="ml-2 text-sm text-muted-foreground">
          {value}/{maxValue}
        </span>
      )}
      
      {penaltyApplied && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-1">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Geç teslim cezası uygulandı</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function StarRatingDisplay({
  rating,
  maxRating = 5,
  size = "sm",
  showLabel = true,
}: {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <StarRating value={rating} maxValue={maxRating} readonly size={size} />
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          ({(rating ?? 0).toFixed(1)}/5)
        </span>
      )}
    </div>
  );
}

export function CompositeScoreDisplay({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (s >= 60) return "text-amber-600 dark:text-amber-400";
    if (s >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn("font-bold", sizeClasses[size], getScoreColor(score))}>
        {score}
      </span>
      <span className="text-xs text-muted-foreground">/ 100</span>
    </div>
  );
}
