/**
 * The Promise Stop.
 *
 * One painting, full-bleed, behind everything — a roadside cafe where people
 * pin what they said they'd do to the wall before walking on. The whole app
 * is an overlay on top of it.
 *
 * It's a plain <picture>, not next/image: the art is fixed and known ahead of
 * time, so it's pre-encoded to AVIF/WebP at four widths and served straight
 * from /public. No request-time transforms, no optimizer quota, and the
 * browser picks the smallest file that fits the screen (~31 KB on a phone,
 * ~158 KB on a large display).
 *
 * A scrim sits over the top and bottom edges — the painting is mid-tone and
 * busy up there, and the wordmark and nav have to stay readable against it.
 */

const WIDTHS = [640, 900, 1280, 1672] as const;

const srcSet = (ext: "avif" | "webp") =>
  WIDTHS.map((w) => `/bg/promise-stop-${w}.${ext} ${w}w`).join(", ");

export function SceneBackdrop() {
  // z-0 rather than a negative index: a negative z-index paints this layer
  // behind the root canvas background, which drops the painting entirely.
  // The app's own content is lifted to z-10 in the layout instead.
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#2b2a26]">
      {/* On a portrait screen `cover` crops to the valley and loses the wall
          the promises are pinned to — the whole subject — so narrow screens
          anchor onto the wall rather than the centre of the painting. */}
      <picture>
        <source type="image/avif" srcSet={srcSet("avif")} sizes="100vw" />
        <source type="image/webp" srcSet={srcSet("webp")} sizes="100vw" />
        <img
          src="/bg/promise-stop-1672.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-[26%_center] sm:object-center"
        />
      </picture>

      {/* Legibility scrims. Kept to the edges so the middle of the painting —
          the wall, the notes, the valley — stays untouched. */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}
