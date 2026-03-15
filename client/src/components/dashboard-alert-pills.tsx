import { cn } from '@/lib/utils';

export interface AlertPill {
  label: string;
  variant: 'red' | 'orange' | 'green' | 'blue' | 'purple';
  dot?: boolean;
}

const VARIANT_CLASSES: Record<string, { pill: string; dot: string }> = {
  red:    { pill: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300', dot: 'bg-red-500' },
  orange: { pill: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300', dot: 'bg-orange-500' },
  green:  { pill: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', dot: 'bg-green-500' },
  blue:   { pill: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', dot: 'bg-blue-500' },
  purple: { pill: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300', dot: 'bg-purple-500' },
};

interface Props {
  pills: AlertPill[];
  className?: string;
}

export function DashboardAlertPills({ pills, className }: Props) {
  if (!pills.length) return null;

  return (
    <div className={cn('flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide', className)}>
      {pills.map((pill, i) => {
        const v = VARIANT_CLASSES[pill.variant];
        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
              'text-[9px] font-semibold whitespace-nowrap flex-shrink-0',
              'border border-border/40',
              v.pill
            )}
            data-testid={`alert-pill-${i}`}
          >
            {pill.dot !== false && (
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', v.dot)} />
            )}
            {pill.label}
          </span>
        );
      })}
    </div>
  );
}
