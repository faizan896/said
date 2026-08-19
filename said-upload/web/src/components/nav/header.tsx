import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { AccountButton } from "@/components/wallet/account-button";

/**
 * The header floats directly on the painting instead of sitting in a bar of
 * its own, so the art runs edge to edge behind it. The wordmark is bare
 * paper-coloured type over the scrim; anything interactive sits in a dark
 * chip so it stays readable wherever the art underneath happens to be bright.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-30">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="said — home">
          <Wordmark size="sm" className="on-art" />
        </Link>

        <div className="flex items-center gap-2">
          <nav className="chip hidden items-center gap-1 rounded-full p-1 text-sm sm:flex">
            <Link
              href="/explore"
              className="rounded-full px-3.5 py-1.5 text-paper/75 transition hover:bg-paper/10 hover:text-paper"
            >
              explore
            </Link>
            <Link
              href="/new"
              className="rounded-full bg-paper px-3.5 py-1.5 font-medium text-ink transition hover:bg-paper/90"
            >
              make a promise
            </Link>
          </nav>

          <div className="chip rounded-full p-0.5">
            <AccountButton />
          </div>
        </div>
      </div>
    </header>
  );
}
