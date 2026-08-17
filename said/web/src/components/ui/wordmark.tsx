import clsx from "clsx";
import Link from "next/link";

export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-[clamp(3.5rem,12vw,7rem)]",
  }[size];

  return (
    <Link
      href="/"
      className={clsx("font-serif font-normal tracking-tight text-ink", sizeClasses, className)}
    >
      said
    </Link>
  );
}
