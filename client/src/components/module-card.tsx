import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModuleCardProps {
  label: string;
  sublabel?: string;
  path: string;
  icon: React.ReactNode;
  gradient?: string;
  coverImageUrl?: string;
  badge?: string;
  badgeVariant?: 'red' | 'orange' | 'blue' | 'purple';
  className?: string;
}

export function ModuleCard({
  label, sublabel, path, icon, gradient,
  coverImageUrl, badge, badgeVariant = 'red', className,
}: ModuleCardProps) {
  const badgeColors = {
    red:    'bg-[#cc1f1f] text-white',
    orange: 'bg-[#c2410c] text-white',
    blue:   'bg-[#1d4ed8] text-white',
    purple: 'bg-[#7c3aed] text-white',
  };

  return (
    <Link href={path}>
      <div
        className={cn(
          'group rounded-xl overflow-hidden cursor-pointer transition-all duration-200',
          'border border-border bg-card',
          'hover:-translate-y-0.5 hover:shadow-md',
          className
        )}
        data-testid={`module-card-${path.replace(/\//g, '-').replace(/^-/, '')}`}
      >
        <div className="relative w-full aspect-video overflow-hidden">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={cn(
              'w-full h-full flex items-center justify-center',
              gradient ?? 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700'
            )}>
              <span className="text-2xl select-none">{icon}</span>
            </div>
          )}

          {coverImageUrl && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
          )}

          {badge && (
            <span className={cn(
              'absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-md',
              badgeColors[badgeVariant]
            )}>
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-foreground truncate leading-tight">
              {label}
            </div>
            {sublabel && (
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {sublabel}
              </div>
            )}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#cc1f1f] flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
