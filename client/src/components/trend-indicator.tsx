import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  current: number;
  previous: number;
  showPercentage?: boolean;
  inverted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TrendIndicator({ 
  current, 
  previous, 
  showPercentage = true,
  inverted = false,
  size = 'sm'
}: TrendIndicatorProps) {
  const diff = current - previous;
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  // Handle special case: previous is 0
  if (previous === 0) {
    if (current === 0) {
      // Both zero - no change
      return (
        <div className="flex items-center gap-0.5 text-muted-foreground">
          <Minus className={iconSizes[size]} />
          {showPercentage && <span className={textSizes[size]}>-</span>}
        </div>
      );
    }
    // New value from zero - show "Yeni" indicator
    const isPositive = inverted ? current < 0 : current > 0;
    return (
      <div className={`flex items-center gap-0.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        <TrendingUp className={iconSizes[size]} />
        {showPercentage && <span className={textSizes[size]}>Yeni</span>}
      </div>
    );
  }

  const percentage = Math.round((diff / previous) * 100);

  if (diff === 0) {
    return (
      <div className="flex items-center gap-0.5 text-muted-foreground">
        <Minus className={iconSizes[size]} />
        {showPercentage && <span className={textSizes[size]}>0%</span>}
      </div>
    );
  }

  const isPositive = inverted ? diff < 0 : diff > 0;
  const color = isPositive ? 'text-green-500' : 'text-red-500';
  const Icon = diff > 0 ? TrendingUp : TrendingDown;

  return (
    <div className={`flex items-center gap-0.5 ${color}`}>
      <Icon className={iconSizes[size]} />
      {showPercentage && (
        <span className={textSizes[size]}>
          {diff > 0 ? '+' : ''}{percentage}%
        </span>
      )}
    </div>
  );
}

export function ComparisonBadge({
  label,
  current,
  previous,
  inverted = false
}: {
  label: string;
  current: number;
  previous: number;
  inverted?: boolean;
}) {
  const diff = current - previous;
  const isPositive = inverted ? diff < 0 : diff > 0;
  
  // Handle previous=0 case
  let displayText: string;
  if (previous === 0) {
    displayText = current === 0 ? '-' : 'Yeni';
  } else {
    const percentage = Math.round((diff / previous) * 100);
    displayText = `${diff > 0 ? '+' : ''}${percentage}%`;
  }
  
  const bgColor = isPositive ? 'bg-green-500/10 border-green-500/30' : diff < 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-muted';
  const textColor = isPositive ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${bgColor}`}>
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className={`text-xs font-medium ${textColor}`}>
        {displayText}
      </span>
      <TrendIndicator 
        current={current} 
        previous={previous} 
        showPercentage={false}
        inverted={inverted}
        size="sm"
      />
    </div>
  );
}
