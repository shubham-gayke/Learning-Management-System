import { cn } from '../../lib/utils';

const variantClasses = {
  text: 'h-4 w-full rounded-md',
  card: 'h-48 w-full rounded-2xl',
  circle: 'h-12 w-12 rounded-full',
  rect: 'h-24 w-full rounded-xl',
};

export default function Skeleton({ variant = 'text', className }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200 dark:bg-slate-700',
        variantClasses[variant],
        className
      )}
    />
  );
}

/** Convenience: multiple text lines */
export function SkeletonLines({ count = 3, className }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === count - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  );
}
