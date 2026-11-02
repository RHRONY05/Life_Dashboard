import React from "react";
import Link from "next/link";
import { Illustration } from "@/components/illustrations";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-ink-3">
      <div className="mb-4">
        <Illustration name="lost" size="lg" />
      </div>
      <h2 className="text-xl font-display font-extrabold text-ink mb-2">
        This page doesn&apos;t exist.
      </h2>
      <p className="max-w-[360px] text-sm text-ink-3 mb-6">
        The link may be broken or the page was moved.
      </p>
      <Link href="/">
        <Button variant="primary">Go to Today</Button>
      </Link>
    </div>
  );
}
