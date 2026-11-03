import React from "react";

export default function TrackersLoading() {
  return (
    <div className="page max-w-[1440px] mx-auto p-3 sm:p-4 md:p-8 animate-fade-in">
      <div className="page-head flex items-center justify-between mb-6">
        <div>
          <div className="sk h-7 w-32 rounded" />
          <div className="sk h-4 w-48 rounded mt-1" />
        </div>
        <div className="sk h-9 w-32 rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 bg-surface border border-frame rounded-lg shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="sk h-6 w-36 rounded" />
              <div className="sk h-5 w-12 rounded-full" />
            </div>
            <div className="sk h-3 w-full rounded-full mt-2" />
            <div className="flex justify-between items-center text-xs mt-2">
              <div className="sk h-4 w-16 rounded" />
              <div className="sk h-4 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
