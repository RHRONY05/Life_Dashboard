import React from "react";

export default function SettingsLoading() {
  return (
    <div className="page max-w-[1440px] mx-auto p-3 sm:p-4 md:p-8 animate-fade-in">
      <div className="page-head mb-6">
        <div className="sk h-7 w-32 rounded" />
        <div className="sk h-4 w-44 rounded mt-1" />
      </div>

      <div className="flex flex-col gap-6 max-w-[800px]">
        {/* Section 1 */}
        <div className="p-6 bg-surface border border-frame rounded-lg shadow-sm flex flex-col gap-4">
          <div className="sk h-6 w-36 rounded" />
          <div className="sk h-4 w-72 rounded" />
          <div className="sk h-10 w-full rounded-md" />
        </div>

        {/* Section 2 */}
        <div className="p-6 bg-surface border border-frame rounded-lg shadow-sm flex flex-col gap-4">
          <div className="sk h-6 w-44 rounded" />
          <div className="sk h-4 w-80 rounded" />
          <div className="sk h-24 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
