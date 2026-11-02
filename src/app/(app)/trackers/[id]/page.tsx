import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default async function TrackerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="page max-w-[1440px] mx-auto p-4 md:p-8">
      <div className="mb-4">
        <Link href="/trackers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to trackers
          </Button>
        </Link>
      </div>
      <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight mb-2">
        TRACKER DETAIL
      </h1>
      <p className="text-ink-3 text-sm">Tracker ID: {id}</p>
    </div>
  );
}
