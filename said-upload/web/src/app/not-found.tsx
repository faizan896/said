import Link from "next/link";

export default function NotFound() {
  return (
    <div className="sheet mx-3 mt-2 mb-8 flex max-w-xl flex-col items-start gap-4 px-5 py-14 sm:mx-auto sm:mt-6 sm:px-10">
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
