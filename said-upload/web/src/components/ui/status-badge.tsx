import clsx from "clsx";
import type { PromiseStatus } from "@db/types";

const config: Record<PromiseStatus, { label: string; dot: string; text: string }> = {
  ACTIVE: { label: "active", dot: "bg-ink-faint-2", text: "text-ink-faint" },
  KEPT: { label: "kept", dot: "bg-kept", text: "text-kept" },
  BROKEN: { label: "broken", dot: "bg-broken", text: "text-broken" },
};

export function StatusBadge({ status }: { status: PromiseStatus }) {
  const c = config[status];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide", c.text)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}
