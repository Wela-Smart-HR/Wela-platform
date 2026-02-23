import React from 'react';

/**
 * Skeleton Loading Component
 * Usage: <Skeleton className="h-4 w-32" />
 */
export const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
);

export const CycleListSkeleton = () => (
    <div className="px-5 pt-6 w-full max-w-2xl mx-auto space-y-6">
        {/* Dashboard Skeleton */}
        <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-2xl bg-gray-300" />
            <Skeleton className="h-28 rounded-2xl" />
        </div>

        {/* Active Draft Skeleton */}
        <div>
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-32 rounded-2xl w-full" />
        </div>

        {/* History List Skeleton */}
        <div>
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 rounded-2xl w-full" />
                ))}
            </div>
        </div>
    </div>
);

export const EmployeeListSkeleton = () => (
    <div className="px-5 pt-4 w-full max-w-2xl mx-auto space-y-6">
        {/* Filters */}
        <Skeleton className="h-10 w-full rounded-xl" />

        {/* Group By */}
        <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
        </div>

        {/* List Items */}
        <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24 rounded-2xl w-full" />
            ))}
        </div>
    </div>
);
