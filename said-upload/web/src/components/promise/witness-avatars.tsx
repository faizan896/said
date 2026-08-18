import { shortenAddress } from "@/lib/format";

// Deterministic, dependency-free identicon: a small grid of filled cells
// derived from the address, tinted from a fixed muted palette. No external
// avatar service, no gratuitous color — just enough to feel like a person.
function identiconCells(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const cells: boolean[] = [];
  for (let i = 0; i < 9; i++) {
    cells.push(((hash >> i) & 1) === 1);
  }
  return { cells, hue: hash % 360 };
}

function Identicon({ address, size = 24 }: { address: string; size?: number }) {
  const { cells, hue } = identiconCells(address.toLowerCase());
  const color = `hsl(${hue}, 28%, 42%)`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 3 3"
      className="rounded-full border border-line bg-paper-dim"
      role="img"
      aria-label={`identicon for ${shortenAddress(address)}`}
    >
      {cells.map((filled, i) => (
        <rect
          key={i}
          x={i % 3}
          y={Math.floor(i / 3)}
          width={1}
          height={1}
          fill={filled ? color : "transparent"}
        />
      ))}
    </svg>
  );
}

export function WitnessAvatars({
  addresses,
  total,
  max = 6,
}: {
  addresses: string[];
  total: number;
  max?: number;
}) {
  const shown = addresses.slice(0, max);
  const overflow = total - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {shown.map((addr) => (
          <div key={addr} className="ring-2 ring-paper rounded-full" title={shortenAddress(addr)}>
            <Identicon address={addr} />
          </div>
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-2 text-xs text-ink-faint">+{overflow} more</span>
      )}
    </div>
  );
}
