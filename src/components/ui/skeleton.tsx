import { cn } from '~/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

const BalanceSkeleton: React.FC = () => {
  return (
    <div className="flex w-full gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-10" />
      </div>
    </div>
  );
};

export { Skeleton, BalanceSkeleton };
