"use client";

/**
 * The room behind the paper.
 *
 * A small cafe on a traffic island at dusk, seen from across a wet street:
 * warm window light, rain, steam off a cup on the outside table, and the
 * occasional car sweeping past. It is deliberately *slow* — nothing here
 * competes with the promise you came to read. Every moving part is either
 * periodic or drifting; there is no motion designed to catch the eye.
 *
 * Constraints this file takes seriously:
 *   - `prefers-reduced-motion` renders exactly one frame and stops.
 *   - The render loop halts whenever the tab is hidden, so a backgrounded
 *     phone isn't spending battery on rain.
 *   - Device pixel ratio is capped; on a 3x phone screen the difference is
 *     invisible and the fill cost is not.
 *   - Everything allocated here is disposed on unmount.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Palette — the same warm/ink family as the rest of the app, pushed to dusk.
// ---------------------------------------------------------------------------

const COLOR = {
  skyTop: new THREE.Color("#2d3446"),
  skyLow: new THREE.Color("#4a4436"),
  fog: new THREE.Color("#2a2b30"),
  road: new THREE.Color("#282b35"),
  kerb: new THREE.Color("#33343c"),
  facade: new THREE.Color("#3a3128"),
  awning: new THREE.Color("#b65c36"), // the app's accent
  window: new THREE.Color("#f6cf95"),
  windowDeep: new THREE.Color("#e09a4e"),
  lamp: new THREE.Color("#ffd9a0"),
  silhouette: new THREE.Color("#241c14"),
  rain: new THREE.Color("#9fb0c4"),
};

// ---------------------------------------------------------------------------
// A soft radial dot, drawn once and reused for every glow and puff of steam.
// ---------------------------------------------------------------------------

function makeGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.42)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Rain. One instanced quad per drop, positioned entirely on the GPU: the CPU
// never touches a drop after setup, so 900 of them cost about as much as one.
// ---------------------------------------------------------------------------

const RAIN_COUNT = 900;
const RAIN_FALL = 26; // height of the wrap-around column

function makeRain(): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;
  geo.instanceCount = RAIN_COUNT;

  const seed = new Float32Array(RAIN_COUNT * 4); // x, z, speed, length
  for (let i = 0; i < RAIN_COUNT; i++) {
    seed[i * 4 + 0] = (Math.random() - 0.5) * 60;
    seed[i * 4 + 1] = -6 + Math.random() * 26;
    seed[i * 4 + 2] = 7 + Math.random() * 9;
    seed[i * 4 + 3] = 0.35 + Math.random() * 0.75;
  }
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 4));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: COLOR.rain },
      uFall: { value: RAIN_FALL },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime;
      uniform float uFall;
      varying float vFade;

      void main() {
        float speed  = aSeed.z;
        float len    = aSeed.w;

        // Wrap each drop through a tall column; the modulo is what makes the
        // rain continuous without ever resetting a buffer.
        float fallen = mod(uTime * speed + aSeed.x * 3.17, uFall);
        vec3 origin  = vec3(aSeed.x, uFall - fallen, aSeed.y);

        // Wind: drops lean, and lean a little more the faster they fall.
        origin.x += fallen * 0.12;

        vec3 local = position;
        local.x *= 0.012;
        local.y *= len;

        vec4 mv = modelViewMatrix * vec4(origin, 1.0);
        mv.xy += local.xy;

        // Fade in at the top and out near the road so drops never pop.
        vFade = smoothstep(0.0, 3.0, fallen) * (1.0 - smoothstep(uFall - 5.0, uFall, fallen));

        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vFade;
      void main() {
        gl_FragColor = vec4(uColor, vFade * 0.38);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  base.dispose();
  return { mesh, material };
}

// ---------------------------------------------------------------------------
// Wet road. A shader plane rather than a real reflection: the window's light
// is smeared downward and wobbled, which is what a rained-on street actually
// looks like and costs a single draw call.
// ---------------------------------------------------------------------------

function makeWetSheen(): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uWarm: { value: COLOR.window },
      uCool: { value: COLOR.lamp },
      // Where along the plane each reflection sits, in UV space. Set from the
      // layout code so the smear always lands under whatever is glowing.
      uWarmX: { value: 0.3 },
      uCoolX: { value: 0.66 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uWarm;
      uniform vec3 uCool;
      uniform float uWarmX;
      uniform float uCoolX;
      varying vec2 vUv;

      // Cheap value noise — enough to break up a reflection, not enough to
      // be worth a texture fetch.
      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }

      void main() {
        // vUv.y runs from the kerb (0) toward the camera (1).
        float ripple = noise(vec2(vUv.x * 9.0, vUv.y * 3.0 - uTime * 0.28));
        ripple += noise(vec2(vUv.x * 21.0 + 4.0, vUv.y * 7.0 - uTime * 0.5)) * 0.5;

        // Two smears of light: the cafe window, and the street lamp.
        float warm = exp(-pow((vUv.x - uWarmX) * 3.6, 2.0));
        float cool = exp(-pow((vUv.x - uCoolX) * 7.0, 2.0));

        // Reflections stretch toward the viewer and dim as they go.
        float reach = pow(1.0 - vUv.y, 1.7);
        float body  = reach * (0.55 + ripple * 0.62);

        vec3 col = uWarm * warm * body * 0.85 + uCool * cool * body * 0.5;
        gl_FragColor = vec4(col, clamp(body * (warm + cool) * 1.15, 0.0, 0.62));
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(46, 22), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(-1, 0.012, 6.5);
  mesh.renderOrder = 2;
  return { mesh, material };
}

// ---------------------------------------------------------------------------
// The cafe itself: a lit box on a traffic island, with dark shapes inside it.
// ---------------------------------------------------------------------------

function buildCafe(glow: THREE.Texture): THREE.Group {
  const cafe = new THREE.Group();

  const facadeMat = new THREE.MeshStandardMaterial({
    color: COLOR.facade,
    roughness: 0.92,
    metalness: 0,
  });

  // Body — deliberately small. It should read as a kiosk someone ducked into,
  // not a building.
  const body = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.9, 5), facadeMat);
  body.position.set(0, 1.95, 0);
  cafe.add(body);

  // Roof slab, slightly overhanging.
  const roof = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.28, 5.7), facadeMat);
  roof.position.set(0, 4.02, 0);
  cafe.add(roof);

  // The window — the only real light source in the scene.
  const windowMat = new THREE.MeshBasicMaterial({ color: COLOR.window, toneMapped: false });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.2), windowMat);
  glass.position.set(0, 2.15, 2.51);
  cafe.add(glass);

  // Warm falloff around the glass, so the light feels like it leaves the box.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 7),
    new THREE.MeshBasicMaterial({
      map: glow,
      color: COLOR.windowDeep,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  halo.position.set(0, 2.2, 2.62);
  halo.renderOrder = 3;
  cafe.add(halo);

  // Inside: counter, a couple of tables, two people. Read as silhouettes
  // because they sit in front of the emissive glass.
  const dark = new THREE.MeshBasicMaterial({ color: COLOR.silhouette });

  const counter = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.75, 0.3), dark);
  counter.position.set(-0.4, 1.5, 2.42);
  cafe.add(counter);

  const seatedTorso = (x: number, h: number) => {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, h, 4, 8), dark);
    torso.position.y = 1.95 + h * 0.1;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), dark);
    head.position.y = 2.5 + h * 0.24;
    g.add(torso, head);
    g.position.set(x, 0, 2.36);
    return g;
  };
  cafe.add(seatedTorso(-2.1, 0.5), seatedTorso(1.6, 0.42));

  // Awning in the app's terracotta — the one saturated thing in the frame.
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(7.9, 0.12, 1.5),
    new THREE.MeshStandardMaterial({ color: COLOR.awning, roughness: 0.8 }),
  );
  awning.position.set(0, 3.5, 3.15);
  awning.rotation.x = -0.22;
  cafe.add(awning);

  // The island the cafe stands on, and its kerb.
  const island = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: COLOR.kerb, roughness: 0.95 }),
  );
  island.position.set(0, 0.11, 0.4);
  cafe.add(island);

  return cafe;
}

// ---------------------------------------------------------------------------
// The outside table: the actual subject of the picture. Someone stopped here.
// ---------------------------------------------------------------------------

function buildTable(glow: THREE.Texture): { group: THREE.Group; steam: THREE.Sprite[] } {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: "#4a3a2a", roughness: 0.85 });

  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.07, 20), wood);
  top.position.y = 0.78;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.78, 10), wood);
  stem.position.y = 0.39;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 16), wood);
  foot.position.y = 0.03;
  group.add(top, stem, foot);

  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), wood);
  chair.position.set(0.05, 0.5, 0.95);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.06), wood);
  chairBack.position.set(0.05, 0.78, 1.19);
  group.add(chair, chairBack);

  // The cup. Small, warm, and the reason the steam exists.
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.06, 0.11, 14),
    new THREE.MeshStandardMaterial({ color: "#e8e2d4", roughness: 0.6 }),
  );
  cup.position.set(-0.13, 0.87, 0.06);
  group.add(cup);

  // A notebook, open, waiting. (You are meant to notice this one late.)
  const page = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.012, 0.3),
    new THREE.MeshStandardMaterial({ color: "#faf9f6", roughness: 0.9 }),
  );
  page.position.set(0.16, 0.822, 0.1);
  page.rotation.y = 0.4;
  group.add(page);

  const steam: THREE.Sprite[] = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: "#d8cdbb",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    s.position.copy(cup.position);
    s.userData.phase = i / 5;
    steam.push(s);
    group.add(s);
  }

  return { group, steam };
}

// ---------------------------------------------------------------------------

export function CafeScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // If WebGL isn't available we simply never mount a canvas and the CSS
    // gradient underneath stands in for the scene.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(COLOR.fog, 0.024);

    const camera = new THREE.PerspectiveCamera(46, host.clientWidth / host.clientHeight, 0.1, 120);

    const glow = makeGlowTexture();
    const disposables: { dispose(): void }[] = [glow];

    // -- sky ----------------------------------------------------------------
    const skyGeo = new THREE.SphereGeometry(60, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: COLOR.skyTop },
        uLow: { value: COLOR.skyLow },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uLow; varying vec3 vP;
        void main(){
          float h = clamp(vP.y / 34.0 + 0.22, 0.0, 1.0);
          gl_FragColor = vec4(mix(uLow, uTop, pow(h, 0.75)), 1.0);
        }`,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
    disposables.push(skyGeo, skyMat);

    // -- road ---------------------------------------------------------------
    const roadGeo = new THREE.PlaneGeometry(90, 70);
    const roadMat = new THREE.MeshStandardMaterial({ color: COLOR.road, roughness: 0.55, metalness: 0.25 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);
    disposables.push(roadGeo, roadMat);

    const sheen = makeWetSheen();
    scene.add(sheen.mesh);
    disposables.push(sheen.mesh.geometry, sheen.material);

    // -- cafe + table -------------------------------------------------------
    // Both live on one island so the story stays together: the cup on the
    // table belongs to the light coming out of that window. The island moves
    // as a unit when the viewport changes shape.
    const island = new THREE.Group();

    const cafe = buildCafe(glow);
    cafe.position.set(0, 0, 0);
    cafe.rotation.y = 0.5;
    island.add(cafe);

    const table = buildTable(glow);
    table.group.position.set(-3.4, 0.22, 3.4);
    table.group.rotation.y = 0.5;
    island.add(table.group);

    scene.add(island);

    // -- street lamp --------------------------------------------------------
    const lampGroup = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 5.2, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: "#2b2c33", roughness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.6;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 12, 10),
      new THREE.MeshBasicMaterial({ color: COLOR.lamp, toneMapped: false }),
    );
    bulb.position.y = 5.2;
    const lampHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: COLOR.lamp,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    lampHalo.scale.setScalar(5.5);
    lampHalo.position.y = 5.2;
    lampGroup.add(pole, bulb, lampHalo);
    lampGroup.position.set(6.4, 0, 1.4);
    scene.add(lampGroup);
    disposables.push(poleGeo, poleMat);

    // -- rain ---------------------------------------------------------------
    const rain = makeRain();
    scene.add(rain.mesh);
    disposables.push(rain.mesh.geometry, rain.material);

    // -- headlights ---------------------------------------------------------
    // Two stretched additive cards that cross the foreground now and then.
    // A car every ~14s reads as "a quiet street", not "traffic".
    const carGeo = new THREE.PlaneGeometry(3.4, 0.42);
    const carMat = new THREE.MeshBasicMaterial({
      map: glow,
      color: "#ffe9c4",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const car = new THREE.Mesh(carGeo, carMat);
    car.position.set(0, 0.55, 8.2);
    car.renderOrder = 5;
    scene.add(car);
    disposables.push(carGeo, carMat);

    // -- lighting -----------------------------------------------------------
    scene.add(new THREE.HemisphereLight(0x6b7690, 0x232430, 1.15));
    const key = new THREE.PointLight(0xffbc72, 26, 24, 2);
    key.position.set(-3.2, 2.6, 0.4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fa6c4, 0.35);
    rim.position.set(6, 7, 4);
    scene.add(rim);

    // -- framing ------------------------------------------------------------
    // The content column sits dead centre, so the composition is pushed out to
    // the edges: cafe left, table and lamp right. On narrow screens we pull
    // back and drop the camera so the cafe still reads under the text.
    // Where the camera aims, which changes with the shape of the viewport.
    const target = new THREE.Vector3();
    let baseCameraY = 2.6;

    const frame = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      const aspect = w / h;
      camera.aspect = aspect;

      if (aspect < 0.85) {
        // Phone. The sheet of paper covers the middle of the screen, so the
        // island is pushed up into the band above it and the camera tips down
        // to put the cafe high in frame.
        camera.fov = 62;
        camera.position.set(0.2, 5.2, 10);
        target.set(-1.0, -2.6, -2);
        island.position.set(-1.0, 0, -13);
        key.position.set(-1.2, 2.6, -12.6);
      } else if (aspect < 1.45) {
        // Tablet / small laptop. Some room at the sides, not much.
        camera.fov = 52;
        camera.position.set(1.6, 2.9, 14);
        target.set(-0.4, 2.0, -1);
        island.position.set(-7.0, 0, -7.5);
        key.position.set(-7.2, 2.6, -7.1);
      } else {
        // Desktop. The island sits fully inside the left margin, the lamp and
        // the wet road fill the right.
        camera.fov = 46;
        camera.position.set(1.2, 2.6, 12.4);
        target.set(-0.2, 2.1, -1);
        island.position.set(-8.2, 0, -8.5);
        key.position.set(-8.4, 2.6, -8.1);
      }

      // Keep the road's reflections under the things that cast them.
      // The sheen plane is 46 wide, centred at x = -1.
      const toUv = (worldX: number) => (worldX + 1) / 46 + 0.5;
      sheen.material.uniforms.uWarmX.value = toUv(island.position.x + 0.6);
      sheen.material.uniforms.uCoolX.value = toUv(lampGroup.position.x);

      baseCameraY = camera.position.y;
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    frame();

    const ro = new ResizeObserver(frame);
    ro.observe(host);

    // -- loop ---------------------------------------------------------------
    const clock = new THREE.Clock();
    let raf = 0;
    let nextCarAt = 6;

    const draw = (t: number) => {
      rain.material.uniforms.uTime.value = t;
      sheen.material.uniforms.uTime.value = t;

      // Steam: each puff rises, widens and fades on its own offset loop.
      for (const s of table.steam) {
        const life = ((t * 0.34 + (s.userData.phase as number)) % 1 + 1) % 1;
        s.position.y = 0.93 + life * 0.62;
        s.position.x = -0.13 + Math.sin(life * 4.1 + (s.userData.phase as number) * 6.3) * 0.07;
        s.scale.setScalar(0.16 + life * 0.42);
        (s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.2;
      }

      // A car, occasionally.
      if (t > nextCarAt) {
        const progress = (t - nextCarAt) / 2.3;
        if (progress >= 1) {
          nextCarAt = t + 11 + Math.random() * 9;
          carMat.opacity = 0;
        } else {
          car.position.x = -16 + progress * 32;
          carMat.opacity = Math.sin(progress * Math.PI) * 0.75;
        }
      }

      // A very slow breath, so the frame is never perfectly static.
      camera.position.y = baseCameraY + Math.sin(t * 0.12) * 0.06;
      camera.lookAt(target);

      renderer.render(scene, camera);
    };

    if (reduceMotion) {
      draw(3.2); // one representative frame, then nothing moves.
    } else {
      const tick = () => {
        raf = requestAnimationFrame(tick);
        draw(clock.getElapsedTime());
      };
      raf = requestAnimationFrame(tick);
    }

    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        const tick = () => {
          raf = requestAnimationFrame(tick);
          draw(clock.getElapsedTime());
        };
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      });
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />;
}
