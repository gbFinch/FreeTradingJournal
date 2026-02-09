function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
      </div>
      <div className="h-11 flex items-center">
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
      </div>
    </div>
  );
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className || ''}`}>
      <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-4" />
      <div className="h-[300px] bg-gray-100 dark:bg-gray-700/50 rounded animate-shimmer" />
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Metric cards skeleton - 5 cards in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Charts row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Equity curve placeholder - 1/3 width */}
        <SkeletonChart className="min-h-[400px] lg:col-span-1" />

        {/* Calendar/grid placeholder - 2/3 width */}
        <SkeletonChart className="lg:col-span-2" />
      </div>
    </div>
  );
}
