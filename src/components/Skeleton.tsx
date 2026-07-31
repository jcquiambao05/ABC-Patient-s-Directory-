import React from 'react';

// Base shimmer block — use className to control size
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

// Patient card skeleton — matches PatientCard layout
export function PatientCardSkeleton() {
  return (
    <div className="px-4 py-3 flex items-center gap-3 border-b border-zinc-100 last:border-0">
      <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

// Cabinet group skeleton — letter + 3 cards
export function CabinetSkeleton() {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-1 py-1.5">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden divide-y divide-zinc-100">
        <PatientCardSkeleton />
        <PatientCardSkeleton />
        <PatientCardSkeleton />
      </div>
    </div>
  );
}

// Queue row skeleton
export function QueueRowSkeleton() {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-4">
      <Skeleton className="w-7 h-7 rounded-full" />
      <Skeleton className="w-9 h-9 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-28 rounded-lg" />
    </div>
  );
}

// Dashboard stat card skeleton
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 md:p-6 space-y-3">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-9 w-2/3" />
    </div>
  );
}

// Dashboard recent patient row skeleton
export function RecentPatientSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 flex items-center gap-3 border border-zinc-100">
      <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

// Calendar day cell skeleton
export function CalendarDaySkeleton() {
  return (
    <div className="border-r border-b border-zinc-100 h-[140px] p-2 space-y-1.5">
      <Skeleton className="w-6 h-6 rounded-full" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
    </div>
  );
}
