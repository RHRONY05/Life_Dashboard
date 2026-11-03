import React from "react";

export default function CanvasLoading() {
  return (
    <div className="page max-w-[1440px] mx-auto p-3 sm:p-4 md:p-8 animate-fade-in">
      {/* Canvas Layout */}
      <div className="canvas-wrap grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Pane Skeleton (desktop) */}
        <div className="hidden md:flex flex-col gap-3">
          {/* Scratch Nav Item */}
          <div className="sk h-14 w-full rounded-lg" />
          {/* Search Box */}
          <div className="sk h-9 w-full rounded-md" />
          {/* Note Rows */}
          <div className="flex flex-col gap-2 p-1.5 bg-surface border border-frame rounded-lg">
            <div className="sk h-14 w-full rounded" />
            <div className="sk h-14 w-full rounded" />
            <div className="sk h-14 w-full rounded" />
            <div className="sk h-14 w-full rounded" />
          </div>
        </div>

        {/* Right Editor Card Skeleton */}
        <section className="ecard bg-surface border border-frame rounded-lg shadow-md flex flex-col min-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="ecard-head hidden md:flex items-center gap-3 px-5 py-3 border-b border-frame">
            <div className="sk h-6 w-28 rounded" />
            <div className="sk h-4 w-20 rounded ml-2" />
            <div className="flex-1" />
            <div className="sk h-8 w-32 rounded" />
            <div className="sk h-8 w-28 rounded" />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-frame bg-surface">
            <div className="sk h-7 w-7 rounded" />
            <div className="sk h-7 w-7 rounded" />
            <div className="sk h-7 w-7 rounded" />
            <div className="h-5 w-[1px] bg-line-strong mx-1" />
            <div className="sk h-7 w-7 rounded" />
            <div className="sk h-7 w-7 rounded" />
            <div className="sk h-7 w-7 rounded" />
            <div className="h-5 w-[1px] bg-line-strong mx-1" />
            <div className="sk h-7 w-7 rounded" />
            <div className="sk h-7 w-7 rounded" />
            <div className="sk h-7 w-7 rounded" />
          </div>

          {/* Canvas Writing Body */}
          <div className="w-full max-w-[840px] mx-auto p-4 md:p-8 flex flex-col gap-4">
            <div className="sk h-7 w-3/5 rounded" />
            <div className="sk h-4 w-5/6 rounded mt-2" />
            <div className="sk h-4 w-4/5 rounded" />
            <div className="sk h-4 w-2/3 rounded" />
            <div className="sk h-4 w-3/4 rounded mt-2" />
            <div className="sk h-4 w-1/2 rounded" />
          </div>
        </section>
      </div>
    </div>
  );
}
