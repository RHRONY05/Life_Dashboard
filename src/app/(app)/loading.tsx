import React from "react";

export default function TodayLoading() {
  return (
    <div className="page max-w-[1440px] mx-auto p-3 sm:p-4 md:p-8 animate-fade-in">
      {/* Page Header */}
      <div className="page-head hidden md:flex items-center gap-3 mb-6">
        <div className="sk h-7 w-28 rounded" />
        <div className="sk h-4 w-44 rounded" />
      </div>

      {/* Mobile Switcher Skeleton (<768px) */}
      <div className="md:hidden flex gap-2 mb-4 p-1 bg-surface-2 rounded-lg">
        <div className="sk h-8 flex-1 rounded" />
        <div className="sk h-8 flex-1 rounded" />
        <div className="sk h-8 flex-1 rounded" />
        <div className="sk h-8 flex-1 rounded" />
      </div>

      {/* 3-Column Board Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Yesterday */}
        <div className="bcol flex flex-col gap-3 p-4 bg-surface border border-frame rounded-lg shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="sk h-5 w-24 rounded" />
            <div className="sk h-4 w-8 rounded-full" />
          </div>
          <div className="sk h-12 w-full rounded-md" />
          <div className="sk h-12 w-full rounded-md" />
        </div>

        {/* Column 2: Today */}
        <div className="bcol flex flex-col gap-3 p-4 bg-surface border border-frame rounded-lg shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="sk h-5 w-20 rounded" />
            <div className="sk h-4 w-12 rounded-full" />
          </div>
          {/* Task Input Skeleton */}
          <div className="sk h-10 w-full rounded-md" />
          {/* Task Rows */}
          <div className="sk h-12 w-full rounded-md" />
          <div className="sk h-12 w-full rounded-md" />
          <div className="sk h-12 w-full rounded-md" />
        </div>

        {/* Column 3: Tomorrow */}
        <div className="bcol flex flex-col gap-3 p-4 bg-surface border border-frame rounded-lg shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="sk h-5 w-24 rounded" />
            <div className="sk h-4 w-8 rounded-full" />
          </div>
          <div className="sk h-12 w-full rounded-md" />
          <div className="sk h-12 w-full rounded-md" />
        </div>
      </div>

      {/* Lists Rail Skeleton */}
      <div className="mt-8 p-4 bg-surface border border-frame rounded-lg">
        <div className="sk h-5 w-24 rounded mb-3" />
        <div className="flex flex-wrap gap-2">
          <div className="sk h-8 w-28 rounded-full" />
          <div className="sk h-8 w-36 rounded-full" />
          <div className="sk h-8 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
