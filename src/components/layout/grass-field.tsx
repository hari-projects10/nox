"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import {
  BACK_RIDGE,
  FRONT_RIDGE,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  skyline,
} from "./landscape";

/* ---- Field layout, in scene units (mirrored into the shaders) ---- */

/** Where the grass, and so the canvas, begins: just above the crest. */
const FIELD_TOP = 578;
/** Past the scene's base, so tufts rooted off screen still fill the edge. */
const FIELD_BOTTOM = 940;
/** Spacing of the rows of tufts at the top of the field… */
const PITCH = 2.2;
/** …and how quickly it opens up towards the viewer. */
const PITCH_SLOPE = 0.025;

/** Segments per strand: enough for a smooth arch at any size on screen. */
const SEGMENTS = 5;
/** Floats per strand: root x, root y, height, width, lean, curl, tone, kind. */
const STRIDE = 8;

/** The frame shown when motion is reduced: a moment mid-gust. */
const STILL_TIME = 37;

/** Resolution ceiling, a budget in device pixels, and tuft density. */
type Quality = { maxDpr: number; pixels: number; density: number };
const HIGH: Quality = { maxDpr: 1.5, pixels: 1.4e6, density: 1 };
/** Dropped to, once, if the device cannot hold a steady frame rate. */
const LOW: Quality = { maxDpr: 1, pixels: 0.8e6, density: 0.6 };

const glsl = (n: number) => n.toFixed(4);

/* ---- Shaders ---- */

/**
 * Resolution of the weather texture: wind, gusts, cloud shade and ground
 * swell over the planted area, baked once a frame so no strand has to work
 * them out for itself.
 */
const WEATHER_TEXELS = [256, 96] as const;

const NOISE = /* glsl */ `
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
`;

const GROUND_SPACE = /* glsl */ `
const float FIELD_TOP = ${glsl(FIELD_TOP)};
const float PITCH = ${glsl(PITCH)};
const float PITCH_SLOPE = ${glsl(PITCH_SLOPE)};
// The ground is seen at a grazing angle, so it runs deeper than the screen
// shows: a gust that is round on the ground reads as a band on screen.
const float DEPTH_STRETCH = 3.5;

float pitchAt(float y) {
  return PITCH + PITCH_SLOPE * max(y - FIELD_TOP, 0.0);
}

// Scene point -> point on the ground. Undoing the perspective here is what
// makes gusts shrink and slow down as they roll away over the crest.
vec2 toGround(vec2 p) {
  float pitch = pitchAt(p.y);
  return vec2(
    (p.x - 800.0) * PITCH / pitch,
    log(pitch / PITCH) / PITCH_SLOPE * PITCH * DEPTH_STRETCH
  );
}
`;

const LIGHT = /* glsl */ `
// Strength of the warm light pooled on the crest, 1 at its heart.
float sunAt(vec2 p) {
  return 1.0 - clamp(length(vec2((p.x - 840.0) / 520.0, (p.y - 640.0) / 104.0)), 0.0, 1.0);
}

// The hill's colour at a scene point, matching the painted SVG version.
vec3 hillColor(vec2 p, float front) {
  float t = clamp((p.y - 600.0) / 300.0, 0.0, 1.0);
  vec3 col = t < 0.35
    ? mix(vec3(0.784, 0.345, 0.247), vec3(0.608, 0.184, 0.212), t / 0.35)
    : mix(vec3(0.608, 0.184, 0.212), vec3(0.337, 0.090, 0.133), (t - 0.35) / 0.65);

  float e = 1.0 - sunAt(p);
  float outer = clamp(e / 0.5 - 1.0, 0.0, 1.0);
  vec3 sun = e < 0.5
    ? mix(vec3(0.941, 0.635, 0.416), vec3(0.878, 0.494, 0.361), e / 0.5)
    : mix(vec3(0.878, 0.494, 0.361), vec3(0.784, 0.345, 0.247), outer);
  col = mix(col, sun, e < 0.5 ? mix(0.95, 0.55, e / 0.5) : mix(0.55, 0.0, outer));

  vec3 shade = mix(
    vec3(0.525, 0.145, 0.188),
    vec3(0.271, 0.067, 0.102),
    clamp((p.y - 690.0) / 210.0, 0.0, 1.0)
  );
  return mix(col, shade, 0.92 * front);
}
`;

const WEATHER_SAMPLE = /* glsl */ `
uniform sampler2D uWeather;
uniform vec4 uArea; // the planted area: x from, x to, y top, y bottom

// r: how hard the wind pushes, g: gust 0..1, b: cloud 0..1, a: ground swell.
vec4 weatherAt(vec2 p) {
  return texture(uWeather, (p - uArea.xz) / (uArea.yw - uArea.xz));
}
`;

/** One triangle over the whole target, drawn from gl_VertexID alone. */
const WEATHER_VERTEX = /* glsl */ `#version 300 es
out vec2 vUv;

void main() {
  vUv = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(vUv * 2.0 - 1.0, 0.0, 1.0);
}
`;

const WEATHER_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform float uTime;
uniform vec4 uArea;

in vec2 vUv;
out vec4 outWeather;

${NOISE}
${GROUND_SPACE}

// Mostly across the screen, a little away from the viewer.
const vec2 WIND = vec2(0.97, 0.24);

void main() {
  vec2 g = toGround(mix(uArea.xz, uArea.yw, vUv));

  // Gusts: patches of stronger wind rolling across the ground…
  vec2 q = g * 0.004 - WIND * uTime * 0.2;
  float n = noise(q) * 0.6 + noise(q * 2.07 + 11.3) * 0.28 + noise(q * 4.13 - 5.1) * 0.12;
  float gust = smoothstep(0.4, 0.8, n);
  // …riding on the swell that runs through the field between them.
  float roll = sin(dot(g, WIND) * 0.045 - uTime * 2.1 + n * 4.0);
  float push = 0.14 + gust * 0.7 + roll * (0.09 + 0.1 * gust);

  // Shadows of the clouds overhead, drifting with the same wind.
  vec2 c = g * 0.0011 - WIND * uTime * 0.013;
  float cloud = smoothstep(0.52, 0.8, noise(c) * 0.65 + noise(c * 2.3 + 7.7) * 0.35);

  // Gentle rises in the ground itself; their tops catch the light.
  float swell = noise(g * 0.0065 + 3.7) * 0.65 + noise(g * 0.017 - 1.3) * 0.35;

  outWeather = vec4((push + 0.2) / 1.2, gust, cloud, swell);
}
`;

const BLADE_VERTEX = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 aVertex; // along the strand 0..1, side -1 / +1
layout(location = 1) in vec4 aBlade;  // root x, root y, height, width
layout(location = 2) in vec4 aSeed;   // rest lean, rest curl (radians), tone, kind flags

uniform float uTime;
uniform vec4 uXform; // scene -> clip space
uniform float uPx;   // one device pixel, in scene units

out vec3 vColor;
out float vSide;
out float vCover;

${LIGHT}
${WEATHER_SAMPLE}

void main() {
  float tone = aSeed.z;
  float front = mod(aSeed.w, 2.0);
  float flowering = mod(floor(aSeed.w / 2.0), 2.0);
  // Deep in the field the lower third of every strand is hidden behind the
  // tufts in front, so it is never drawn: strands there start 30% up.
  float start = floor(aSeed.w / 4.0) * 0.3;
  float along = start + (1.0 - start) * aVertex.x;
  vec2 root = aBlade.xy;
  float height = aBlade.z;
  vec4 weather = weatherAt(root);
  float gust = weather.g;

  // Every strand flutters at its own rate, and harder inside a gust.
  float rate = 4.0 + fract(tone * 53.17) * 5.0;
  float flutter = sin(uTime * rate + fract(tone * 91.3) * 6.2832) * (0.04 + 0.1 * gust);
  float push = (weather.r * 1.2 - 0.2 + flutter) * (0.75 + 0.5 * fract(tone * 17.9));

  // Bend as an arc of constant length: the root takes a little of the
  // push, the rest curls the strand harder towards its tip.
  float lean = aSeed.x + push * 0.3;
  float curl = clamp(aSeed.y + push * 0.9, -1.5 - lean, 1.5 - lean);
  float angle = lean + curl * along;
  vec2 spine = abs(curl) < 0.001
    ? vec2(sin(lean), -cos(lean)) * height * along
    : vec2(cos(lean) - cos(angle), sin(lean) - sin(angle)) * height / curl;

  // Tapered to a point, and turned edge-on as a gust twists it.
  float radius = aBlade.w * 0.5 * (1.0 - pow(along, 1.3)) * (1.0 - 0.3 * gust * along);
  // Strands finer than a pixel are drawn a pixel wide and faded to match,
  // so the far field stays calm instead of shimmering.
  float drawn = max(radius, 0.6 * uPx);
  vCover = radius / drawn * mix(1.0, smoothstep(start, start + 0.15, along), step(0.01, start));
  vSide = aVertex.y;

  vec2 p = root + spine + vec2(cos(angle), sin(angle)) * aVertex.y * drawn;
  gl_Position = vec4(p * uXform.xy + uXform.zw, 0.0, 1.0);

  float sun = sunAt(root);
  vec3 col = hillColor(root, front) * (0.85 + 0.3 * tone) * (0.82 + 0.36 * weather.a);
  col *= mix(vec3(0.95, 1.04, 1.0), vec3(1.05, 0.93, 0.95), fract(tone * 7.31));
  // Shaded towards the root, where red grass deepens to crimson, not brown.
  col *= mix(vec3(0.5, 0.32, 0.36), vec3(1.16), smoothstep(0.0, 0.8, along));
  // Light through the tips: faint everywhere, glowing where the sun sits.
  col += (vec3(0.06, 0.03, 0.025) + vec3(0.34, 0.2, 0.13) * sun * sun) * along * along;
  // Pressed over by a gust, strands turn their paler sides to the light.
  col = mix(col, col * 1.6 + vec3(0.06, 0.035, 0.025), gust * along * 0.8);
  col *= 1.0 - 0.2 * weather.b;
  // Pale flowering weeds dotted through the grass.
  col = mix(col, vec3(0.86, 0.74, 0.74) * (0.8 + 0.3 * tone), flowering * smoothstep(0.2, 0.8, along) * 0.8);
  vColor = col;
}
`;

const BLADE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec3 vColor;
in float vSide;
in float vCover;

out vec4 outColor;

void main() {
  // Coverage across the strand's width, for a clean edge without MSAA.
  float edge = (1.0 - abs(vSide)) / max(fwidth(vSide), 1e-4);
  float alpha = clamp(edge, 0.0, 1.0) * vCover;
  outColor = vec4(vColor * alpha, alpha);
}
`;

const GROUND_VERTEX = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 aGround; // scene x, scene y, depth below the skyline

uniform vec4 uXform;

out vec2 vScene;
out float vBelow;

void main() {
  vScene = aGround.xy;
  vBelow = aGround.z;
  gl_Position = vec4(aGround.xy * uXform.xy + uXform.zw, 0.0, 1.0);
}
`;

/** The dense, shaded stems between tufts. */
const GROUND_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform float uPx;
uniform float uFront;

in vec2 vScene;
in float vBelow;

out vec4 outColor;

${NOISE}
${GROUND_SPACE}
${LIGHT}
${WEATHER_SAMPLE}

void main() {
  vec4 weather = weatherAt(vScene);
  vec3 col = hillColor(vScene, uFront) * vec3(0.62, 0.42, 0.46) * (0.78 + 0.44 * weather.a);
  col += vec3(0.1, 0.05, 0.03) * sunAt(vScene);
  // Stems as fine vertical streaks, finer with distance.
  float scale = PITCH / pitchAt(vScene.y);
  col *= 0.8 + 0.4 * noise(vec2(vScene.x * scale * 1.6, vScene.y * 0.25));
  col *= 1.0 - 0.2 * weather.b;

  float alpha = clamp(vBelow / (2.0 * uPx), 0.0, 1.0);
  outColor = vec4(col * alpha, alpha);
}
`;

/* ---- Planting ---- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lattice(x: number, y: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise, so neighbouring tufts lean the same way. */
function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = lattice(xi, yi);
  const b = lattice(xi + 1, yi);
  const c = lattice(xi, yi + 1);
  const d = lattice(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const backSkyline = skyline(BACK_RIDGE);
const frontSkyline = skyline(FRONT_RIDGE);

const pitchAt = (y: number) => PITCH + PITCH_SLOPE * Math.max(0, y - FIELD_TOP);

/**
 * Scatters tufts over the hills between two scene x positions, row by row
 * from the crest down, so the buffer is already in back-to-front order.
 *
 * Each tuft is a fountain of strands, the way this grass grows: upright in
 * the middle, arching out and over towards the edges. Nearer tufts are
 * bigger on screen, so they get more strands to stay full.
 */
function plantField(from: number, to: number, density: number) {
  const random = mulberry32(0x9e3779b9);
  let data = new Float32Array(STRIDE * 131072);
  let count = 0;

  const strand = (
    x: number,
    y: number,
    height: number,
    width: number,
    lean: number,
    curl: number,
    tone: number,
    kind: number,
  ) => {
    if ((count + 1) * STRIDE > data.length) {
      const grown = new Float32Array(data.length * 2);
      grown.set(data);
      data = grown;
    }
    data.set([x, y, height, width, lean, curl, tone, kind], count++ * STRIDE);
  };

  // Where the grass meets the sky it is seen edge-on, as a dense fringe of
  // short strands rather than a ruled line with a few long hairs over it.
  const fringe: { x: number; y: number }[] = [];
  for (let x = from; x < to; x += 0.5 + random() * 0.6) {
    fringe.push({ x, y: Math.min(backSkyline(x), frontSkyline(x)) + 0.6 + random() * 2 });
  }
  fringe.sort((a, b) => a.y - b.y);
  let edge = 0;

  const deepest = PITCH_SLOPE * (FIELD_BOTTOM - FIELD_TOP);
  for (let row = FIELD_TOP; row < FIELD_BOTTOM; ) {
    const pitch = pitchAt(row);
    const nearness = (pitch - PITCH) / deepest; // 0 at the crest, 1 at the base
    const spacing = (1.5 * pitch) / density;

    for (; edge < fringe.length && fringe[edge].y < row + pitch; edge++) {
      const { x, y } = fringe[edge];
      const height = pitchAt(y) * (1.3 + 1.2 * random());
      const lean = (random() - 0.5) * 0.9;
      const front = frontSkyline(x) <= backSkyline(x) ? 1 : 0;
      strand(x, y, height, height * 0.14, lean, lean * (0.8 + 0.8 * random()), random(), front);
    }

    for (let x = from + random() * spacing; x < to; x += spacing * (0.6 + 0.8 * random())) {
      const y = row + (random() - 0.5) * pitch;
      if (y < Math.min(backSkyline(x), frontSkyline(x)) + 0.4) continue;

      // A ragged border between the hills, not a ruled line.
      const front = y > frontSkyline(x) + (random() - 0.35) * 3 * pitch;
      // Now and then a pale flowering weed: a low, rounded, bushy clump.
      const flowering = nearness > 0.3 && random() < 0.0022;
      const size =
        3.2 * pitch * (1 + nearness) * (0.7 + 0.6 * random()) *
        (front ? 1.12 : 1) * (flowering ? 0.45 : 1);
      const tone = random();
      const bias = (valueNoise(x / (6 * pitch), y / (3 * pitch)) - 0.5) * 0.5;
      // Roots stay drawn only where they can be seen: against a skyline.
      const exposed =
        y < Math.min(backSkyline(x), frontSkyline(x)) + 2 * pitch ||
        (y > frontSkyline(x) && y < frontSkyline(x) + 2 * pitch);
      const fan = flowering ? 1.1 : 0.55;
      const strands = Math.round(
        (7 + 9 * nearness) * (flowering ? 4 : 1) * (0.6 + 0.4 * density),
      );

      for (let k = 0; k < strands; k++) {
        const spread = random() * 2 - 1; // -1 the fan's left edge, +1 its right
        const lean = bias + spread * fan + (random() - 0.5) * 0.12;
        const height = size * (1 - 0.3 * Math.abs(spread)) * (0.8 + 0.3 * random());
        strand(
          x + (random() - 0.5) * 0.25 * size,
          y + (random() - 0.5) * 0.3 * pitch,
          height,
          height * (0.075 - 0.02 * nearness) * (0.7 + 0.6 * random()) * (flowering ? 2.6 : 1),
          lean,
          lean * (0.9 + 0.8 * random()), // the edges arch over most
          tone * 0.8 + random() * 0.2,
          (front ? 1 : 0) + (flowering ? 2 : 0) + (exposed ? 0 : 4),
        );
      }
    }
    row += pitch;
  }
  return data.subarray(0, count * STRIDE);
}

/** Two strips of soil, one under each skyline, as (x, y, depth below it). */
function plantGround(from: number, to: number) {
  const step = 4;
  const columns = Math.ceil((to - from) / step) + 1;
  const data = new Float32Array(columns * 2 * 3 * 2);
  let i = 0;
  for (const ridge of [backSkyline, frontSkyline]) {
    for (let c = 0; c < columns; c++) {
      const x = Math.min(to, from + c * step);
      // Just under the fringe, so the grass, not the soil, draws the skyline.
      const top = ridge(x) + 0.9;
      data.set([x, top, 0, x, FIELD_BOTTOM, FIELD_BOTTOM - top], i);
      i += 6;
    }
  }
  return { data, vertices: columns * 2 };
}

/* ---- WebGL ---- */

function link(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  const shaders = (
    [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const
  ).map(([type, source]) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    return shader;
  });
  gl.linkProgram(program);

  const linked = gl.getProgramParameter(program, gl.LINK_STATUS) as boolean;
  if (!linked && process.env.NODE_ENV !== "production") {
    console.error(
      "GrassField:",
      gl.getProgramInfoLog(program),
      ...shaders.map((shader) => gl.getShaderInfoLog(shader)),
    );
  }
  shaders.forEach((shader) => gl.deleteShader(shader));
  if (!linked) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** Software rasterisers cannot hold a live field at any size. */
function isSoftwareRenderer(gl: WebGL2RenderingContext) {
  let renderer = String(gl.getParameter(gl.RENDERER));
  // Chromium and Safari report a generic name unless asked for the real one.
  if (/webkit webgl/i.test(renderer)) {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
}

/**
 * Brings the field to life on `canvas`, sized to `host`. Returns a disposer,
 * or null where it cannot run well (the painted fallback then stays).
 */
function startField(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  still: boolean,
  setLive: (live: boolean) => void,
) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false, // blades carry their own edge coverage
    depth: false,
    stencil: false,
  });
  if (!gl || isSoftwareRenderer(gl)) return null;

  const weatherProgram = link(gl, WEATHER_VERTEX, WEATHER_FRAGMENT);
  const bladeProgram = link(gl, BLADE_VERTEX, BLADE_FRAGMENT);
  const groundProgram = link(gl, GROUND_VERTEX, GROUND_FRAGMENT);
  if (!weatherProgram || !bladeProgram || !groundProgram) return null;

  const weather = {
    time: gl.getUniformLocation(weatherProgram, "uTime"),
    area: gl.getUniformLocation(weatherProgram, "uArea"),
  };
  const blade = {
    time: gl.getUniformLocation(bladeProgram, "uTime"),
    xform: gl.getUniformLocation(bladeProgram, "uXform"),
    px: gl.getUniformLocation(bladeProgram, "uPx"),
    area: gl.getUniformLocation(bladeProgram, "uArea"),
  };
  const ground = {
    xform: gl.getUniformLocation(groundProgram, "uXform"),
    px: gl.getUniformLocation(groundProgram, "uPx"),
    front: gl.getUniformLocation(groundProgram, "uFront"),
    area: gl.getUniformLocation(groundProgram, "uArea"),
  };
  // Strands and soil both read the weather from texture unit 0.
  for (const program of [bladeProgram, groundProgram]) {
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "uWeather"), 0);
  }

  const weatherTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, weatherTexture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, WEATHER_TEXELS[0], WEATHER_TEXELS[1]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const weatherTarget = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, weatherTarget);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, weatherTexture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const weatherVao = gl.createVertexArray();

  // One blade as a strip from root to tip, instanced across the field.
  const template = new Float32Array((SEGMENTS + 1) * 4);
  for (let i = 0; i <= SEGMENTS; i++) template.set([i / SEGMENTS, -1, i / SEGMENTS, 1], i * 4);

  const templateBuffer = gl.createBuffer();
  const bladeBuffer = gl.createBuffer();
  const groundBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, templateBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, template, gl.STATIC_DRAW);

  const bladeVao = gl.createVertexArray();
  gl.bindVertexArray(bladeVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, templateBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuffer);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, STRIDE * 4, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, STRIDE * 4, 16);
  gl.vertexAttribDivisor(2, 1);

  const groundVao = gl.createVertexArray();
  gl.bindVertexArray(groundVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  let quality = HIGH;
  let planted = { from: 0, to: 0, density: 0 };
  let bladeCount = 0;
  let groundVertices = 0;
  const xform = new Float32Array(4);
  const area = new Float32Array([0, 0, FIELD_TOP, FIELD_BOTTOM]);
  let px = 1;

  const plant = (from: number, to: number) => {
    const blades = plantField(from, to, quality.density);
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, blades, gl.STATIC_DRAW);
    bladeCount = blades.length / STRIDE;

    const soil = plantGround(from, to);
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, soil.data, gl.STATIC_DRAW);
    groundVertices = soil.vertices;

    planted = { from, to, density: quality.density };
    area[0] = from;
    area[1] = to;
  };

  /** Fits the canvas to the grass band of the scene; false if unmeasurable. */
  const layout = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return false;

    // Same cover-fit as the SVG layers (preserveAspectRatio "xMidYMid slice").
    const scale = Math.max(width / SCENE_WIDTH, height / SCENE_HEIGHT);
    const left = (width - SCENE_WIDTH * scale) / 2;
    const top = (height - SCENE_HEIGHT * scale) / 2;
    const canvasTop = Math.max(0, Math.floor(top + FIELD_TOP * scale));
    const canvasHeight = height - canvasTop;
    if (canvasHeight <= 0) return false;

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      quality.maxDpr,
      Math.sqrt(quality.pixels / (width * canvasHeight)),
    );
    canvas.style.top = `${canvasTop}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(canvasHeight * dpr);

    xform[0] = (2 * scale) / width;
    xform[1] = (-2 * scale) / canvasHeight;
    xform[2] = (2 * left) / width - 1;
    xform[3] = 1 - (2 * (top - canvasTop)) / canvasHeight;
    px = 1 / (scale * dpr);

    // Plant only what is on screen, plus a margin for blades bending in.
    const from = -left / scale - 24;
    const to = (width - left) / scale + 24;
    if (
      from < planted.from ||
      to > planted.to ||
      to - from < (planted.to - planted.from) * 0.6 ||
      planted.density !== quality.density
    ) {
      plant(from - 80, to + 80);
    }
    return true;
  };

  let shown = false;
  const draw = (time: number) => {
    // This frame's weather, into its texture…
    gl.bindFramebuffer(gl.FRAMEBUFFER, weatherTarget);
    gl.viewport(0, 0, WEATHER_TEXELS[0], WEATHER_TEXELS[1]);
    gl.disable(gl.BLEND);
    gl.useProgram(weatherProgram);
    gl.uniform1f(weather.time, time);
    gl.uniform4fv(weather.area, area);
    gl.bindVertexArray(weatherVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // …then the field, back to front: soil, and the strands over it.
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, weatherTexture);

    gl.useProgram(groundProgram);
    gl.uniform4fv(ground.xform, xform);
    gl.uniform4fv(ground.area, area);
    gl.uniform1f(ground.px, px);
    gl.bindVertexArray(groundVao);
    gl.uniform1f(ground.front, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, groundVertices);
    gl.uniform1f(ground.front, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, groundVertices, groundVertices);

    gl.useProgram(bladeProgram);
    gl.uniform1f(blade.time, time);
    gl.uniform4fv(blade.xform, xform);
    gl.uniform4fv(blade.area, area);
    gl.uniform1f(blade.px, px);
    gl.bindVertexArray(bladeVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2, bladeCount);
    gl.bindVertexArray(null);

    if (!shown) {
      shown = true;
      setLive(true);
    }
  };

  /* ---- Clock: runs only while the field is on screen ---- */

  let clock = still ? STILL_TIME : 20;
  let raf = 0;
  let last = 0;
  let retired = false;
  // Frame timing, judged in windows once the field has settled, so a device
  // that cannot keep up gets a lighter field, and failing that the painting,
  // never a stuttering one.
  const frames: number[] = [];
  let warmup = 60;
  let stalls = 0;

  const pause = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const struggle = () => {
    frames.length = 0;
    warmup = 60;
    stalls = 0;
    if (quality === HIGH) {
      quality = LOW;
      layout();
    } else {
      retired = true;
      pause();
      setLive(false);
    }
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const elapsed = last ? now - last : 0;
    // Hold ~60fps on faster displays; the wind gains nothing above that.
    if (last && elapsed < 12) return;
    last = now;
    clock += Math.min(elapsed, 50) / 1000;
    draw(clock);
    if (!elapsed || warmup-- > 0) return;

    // Repeated long stalls step down at once; a slow median after a window.
    if (elapsed > 250 && ++stalls >= 3) {
      struggle();
      return;
    }
    frames.push(elapsed);
    if (frames.length === 45) {
      const median = frames.sort((a, b) => a - b)[22];
      frames.length = 0;
      stalls = 0;
      if (median > 24) struggle();
    }
  };
  const run = () => {
    if (raf || still || retired || gl.isContextLost()) return;
    last = 0;
    warmup = Math.max(warmup, 30);
    raf = requestAnimationFrame(tick);
  };

  // A tab coming back is not a slow frame.
  const onVisibility = () => {
    last = 0;
  };
  document.addEventListener("visibilitychange", onVisibility);

  const resize = new ResizeObserver(() => {
    if (!retired && !gl.isContextLost() && layout()) draw(clock);
  });
  resize.observe(host);

  const onScreen = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) run();
    else pause();
  });
  onScreen.observe(host);

  const onLost = (event: Event) => {
    event.preventDefault();
    pause();
    setLive(false);
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return () => {
    pause();
    resize.disconnect();
    onScreen.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    document.removeEventListener("visibilitychange", onVisibility);
    [weatherVao, bladeVao, groundVao].forEach((vao) => gl.deleteVertexArray(vao));
    [templateBuffer, bladeBuffer, groundBuffer].forEach((buffer) => gl.deleteBuffer(buffer));
    gl.deleteFramebuffer(weatherTarget);
    gl.deleteTexture(weatherTexture);
    [weatherProgram, bladeProgram, groundProgram].forEach((program) => gl.deleteProgram(program));
  };
}

/**
 * Live grass for the footer hills: every blade is real geometry, bent by
 * gusts that roll across the field in perspective.
 *
 * The painted `fallback` holds the place until the first frame is drawn,
 * and stays for good where WebGL 2 is unavailable or the context is lost.
 * With reduced motion the field renders a single still frame.
 */
export function GrassField({ still, fallback }: { still: boolean; fallback: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    let dispose: (() => void) | null = null;
    let cancelled = false;
    let idle = 0;
    const hasIdle = "requestIdleCallback" in window;

    // Built as the footer approaches, when the browser has a moment spare,
    // so compiling shaders never lands in the middle of a scroll.
    const approach = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        approach.disconnect();
        const start = () => {
          if (!cancelled) dispose = startField(canvas, host, still, setLive);
        };
        idle = hasIdle
          ? window.requestIdleCallback(start, { timeout: 800 })
          : window.setTimeout(start, 120);
      },
      { rootMargin: "100% 0px" },
    );
    approach.observe(host);

    return () => {
      cancelled = true;
      approach.disconnect();
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      dispose?.();
    };
  }, [still]);

  return (
    <>
      <div
        className={cn(
          "absolute inset-0 transition-[opacity,visibility] duration-700",
          live && "invisible opacity-0",
        )}
      >
        {fallback}
      </div>
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-x-0 top-0 h-0 w-full opacity-0 transition-opacity duration-700",
          live && "opacity-100",
        )}
      />
    </>
  );
}
