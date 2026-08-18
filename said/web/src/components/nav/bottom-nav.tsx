"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAccount } from "wagmi";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <circle cx="12" cy="12" r="8" />
      <path d="m14.5 9.5-2 5-3-1.5 2-5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { address } = useAccount();
  const profileHref = address ? `/u/${address}` : "/new";

  const items = [
    { href: "/", label: "home", icon: HomeIcon },
    { href: "/explore", label: "explore", icon: ExploreIcon },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between px-6 py-2">
        {items.slice(0, 2).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-[11px]",
                active ? "text-ink" : "text-ink-faint-2"
              )}
            >
              <Icon active={active} />
              {label}
            </Link>
          );
        })}

        <Link
          href="/new"
          className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper shadow-md"
          aria-label="make a promise"
        >
          <PlusIcon />
        </Link>

        <Link
          href={profileHref}
          className={clsx(
            "flex flex-col items-center gap-1 px-3 py-1.5 text-[11px]",
            pathname.startsWith("/u/") ? "text-ink" : "text-ink-faint-2"
          )}
        >
          <ProfileIcon active={pathname.startsWith("/u/")} />
          profile
        </Link>
      </div>
    </nav>
  );
}
