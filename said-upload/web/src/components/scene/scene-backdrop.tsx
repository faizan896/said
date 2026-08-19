"use client";

/**
 * Mounts the cafe behind the whole app.
 *
 * The three.js bundle is loaded lazily and never server-rendered, so the first
 * paint is the CSS dusk gradient below — which is also what stands in on
 * devices without WebGL. The scene fades in over it once it's ready, so there
 * is no flash of empty canvas.
 */

import dynamic from "next/dynamic";

const CafeScene = dynamic(() => import("./cafe-scene").then((m) => m.CafeScene), {
  ssr: false,
});

export function SceneBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_90%_at_28%_58%,#4a4436_0%,#2f3038_42%,#22242c_100%)]"
    >
      <div className="absolute inset-0 animate-[sceneIn_1.4s_ease-out_both]">
        <CafeScene />
      </div>
    </div>
  );
}
