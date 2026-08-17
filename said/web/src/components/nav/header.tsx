import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { AccountButton } from "@/components/wallet/account-button";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Wordmark size="sm" />
        <nav className="hidden items-center gap-6 text-sm text-ink-faint sm:flex">
          <Link href="/explore" className="hover:text-ink">
            explore
          </Link>
          <Link
            href="/new"
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            make a promise
          </Link>
        </nav>
        <div className="sm:ml-4">
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
