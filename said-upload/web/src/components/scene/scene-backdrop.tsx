/**
 * The Promise Stop.
 *
 * One painting, full-bleed, behind everything — a roadside cafe where people
 * pin what they said they'd do to the wall before walking on. The whole app
 * is an overlay on top of it.
 *
 * It's a plain <img srcset>, not next/image: the art is fixed and known ahead
 * of time, so it's pre-encoded to WebP at four widths and served straight from
 * /public. No request-time transforms, no optimizer quota, and the browser
 * picks the smallest file that fits the screen (~53 KB on a phone, ~264 KB on
 * a large display).
 *
 * A scrim sits over the top and bottom edges — the painting is mid-tone and
 * busy up there, and the wordmark and nav have to stay readable against it.
 */

const WIDTHS = [640, 900, 1280, 1672] as const;

// WebP only, deliberately. AVIF encodes ~40% smaller, but the files this
// image was encoded to decode correctly through canvas and then composite as
// a blank layer in Chrome — the page rendered flat brown with a perfectly
// healthy <img> in the DOM. Not worth 100 KB.
const srcSet = WIDTHS.map((w) => `/bg/promise-stop-${w}.webp ${w}w`).join(", ");

export function SceneBackdrop() {
  // z-0 rather than a negative index: a negative z-index paints this layer
  // behind the root canvas background, which drops the painting entirely.
  // The app's own content is lifted to z-10 in the layout instead.
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#2b2a26]">
      {/* On a portrait screen `cover` crops to the valley and loses the wall
          the promises are pinned to — the whole subject — so narrow screens
          anchor onto the wall rather than the centre of the painting. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- the art is a
          fixed asset already encoded to four widths at build time; routing it
          through next/image would only add a request-time transform (and, on
          Vercel, optimizer quota) for an identical result. */}
      <img
        src="/bg/promise-stop-1672.webp"
        srcSet={srcSet}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="h-full w-full object-cover object-[26%_center] sm:object-center"
      />

      {/* Legibility scrims. Kept to the edges so the middle of the painting —
          the wall, the notes, the valley — stays untouched. */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}
