import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-24">
      <p className="font-serif text-2xl text-ink">nothing here.</p>
      <p className="text-sm text-ink-faint">
        Either this was never said, or the link&rsquo;s wrong.
      </p>
      <Link href="/" className="text-sm text-ink underline decoration-line-strong underline-offset-4">
        back home
      </Link>
    </div>
  );
}
