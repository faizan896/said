"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-24">
      <p className="font-serif text-2xl text-ink">something broke.</p>
      <p className="text-sm text-ink-faint">Not you — us. Try that again.</p>
      <Button onClick={reset}>try again</Button>
    </div>
  );
}
