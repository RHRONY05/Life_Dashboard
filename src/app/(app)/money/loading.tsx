import React from "react";

export default function MoneyLoading() {
  return (
    <div className="page max-w-[1440px] mx-auto p-3 sm:p-4 md:p-8 animate-fade-in">
      <div className="page-head flex items-center justify-between mb-6">
        <div>
          <div className="sk h-7 w-28 rounded" />
          <div className="sk h-4 w-44 rounded mt-1" />
        </div>
        <div className="sk h-9 w-32 rounded-md" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 bg-surface border border-frame rounded-lg shadow-sm flex flex-col gap-2"
          >
            <div className="sk h-4 w-24 rounded" />
            <div className="sk h-8 w-36 rounded" />
            <div className="sk h-3 w-48 rounded mt-1" />
          </div>
        ))}
      </div>

      {/* Transaction Table Skeleton */}
      <div className="bg-surface border border-frame rounded-lg p-5">
        <div className="sk h-6 w-32 rounded mb-4" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="sk h-8 w-8 rounded-full" />
                <div className="flex flex-col gap-1">
                  <div className="sk h-4 w-36 rounded" />
                  <div className="sk h-3 w-20 rounded" />
                </div>
              </div>
              <div className="sk h-5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
