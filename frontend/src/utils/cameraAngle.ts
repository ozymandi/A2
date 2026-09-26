// Camera Angle node: data model, presets, prompt text mapping and 3D→2D sphere projection.
//
// Conventions:
//   hAngle  -180..180  horizontal orbit. 0 = camera in front of the subject,
//                      positive = camera moves to the SUBJECT'S LEFT side (the subject's front then points
//                      to the left edge of the frame), +90 = left side profile, -90 = right side profile,
//                      ±180 = behind. Matches the MiniMax "Left Side" / "Right Side" preset pictures.
//   vAngle   -90..90   vertical orbit. 0 = eye level, positive = camera above (looking down),
//                      negative = camera below (looking up).
//   roll     -45..45   camera tilt around its optical axis (Dutch angle).
//   zoom               framing: long | medium | close.

export type ZoomLevel = 'long' | 'medium' | 'close';

export interface CameraAngleValue {
  hAngle: number;
  vAngle: number;
  roll: number;
  zoom: ZoomLevel;
}

export interface CameraAnglePreset extends CameraAngleValue {
  name: string;
  /** Optional preview image (URL or data URI). When absent, a schematic pictogram is rendered. */
  image?: string;
}

export const DEFAULT_CAMERA_ANGLE: CameraAngleValue = { hAngle: 0, vAngle: 0, roll: 0, zoom: 'medium' };

export const ZOOM_LEVELS: ZoomLevel[] = ['long', 'medium', 'close'];

export const ZOOM_LABELS: Record<ZoomLevel, string> = {
  long: 'Long Shot',
  medium: 'Medium Shot',
  close: 'Close-up',
};

// Preview thumbnails live in frontend/public/camera-angles/ (source PNGs: assets/camera angle pic/)
const PRESET_IMG = (slug: string) => `/camera-angles/${slug}.webp`;

export const CAMERA_ANGLE_PRESETS: CameraAnglePreset[] = [
  { name: 'Eye Level',   hAngle: 0,    vAngle: 0,   roll: 0,  zoom: 'medium', image: PRESET_IMG('eye-level') },
  { name: 'Close-up',    hAngle: 0,    vAngle: 0,   roll: 0,  zoom: 'close',  image: PRESET_IMG('close-up') },
  { name: 'Low Angle',   hAngle: 0,    vAngle: -40, roll: 0,  zoom: 'medium', image: PRESET_IMG('low-angle') },
  { name: 'High Angle',  hAngle: 0,    vAngle: 45,  roll: 0,  zoom: 'medium', image: PRESET_IMG('high-angle') },
  { name: "Bird's Eye",  hAngle: 0,    vAngle: 85,  roll: 0,  zoom: 'long',   image: PRESET_IMG('birds-eye') },
  { name: 'Left Side',   hAngle: 90,   vAngle: 0,   roll: 0,  zoom: 'medium', image: PRESET_IMG('left-side') },
  { name: 'Right Side',  hAngle: -90,  vAngle: 0,   roll: 0,  zoom: 'medium', image: PRESET_IMG('right-side') },
  { name: 'Back View',   hAngle: 180,  vAngle: 10,  roll: 0,  zoom: 'medium', image: PRESET_IMG('back-view') },
  { name: 'Dutch Angle', hAngle: 20,   vAngle: -10, roll: 25, zoom: 'medium', image: PRESET_IMG('dutch-angle') },
];

// ---------- normalisation ----------

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Wraps any angle into (-180, 180]. */
export function wrapAngle(deg: number): number {
  const a = ((((deg + 180) % 360) + 360) % 360) - 180;
  return a === -180 ? 180 : a;
}

const toNumber = (v: unknown, fallback: number) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toZoom = (v: unknown): ZoomLevel => {
  const s = String(v ?? '').toLowerCase();
  if (/close|macro|extreme|detail|face-only|portrait-crop/.test(s)) return 'close';
  if (/\blong\b|wide|full[- ]body|full[- ]shot|establishing|far/.test(s)) return 'long';
  return 'medium';
};

/** Fills missing fields with defaults and clamps ranges. Accepts raw node data. */
export function normalizeCameraAngle(data: any): CameraAngleValue {
  return {
    hAngle: Math.round(wrapAngle(toNumber(data?.hAngle, 0))),
    vAngle: Math.round(clamp(toNumber(data?.vAngle, 0), -90, 90)),
    roll: Math.round(clamp(toNumber(data?.roll, 0), -45, 45)),
    zoom: ZOOM_LEVELS.includes(data?.zoom) ? data.zoom : 'medium',
  };
}

export function isSameAngle(a: CameraAngleValue, b: CameraAngleValue): boolean {
  return a.hAngle === b.hAngle && a.vAngle === b.vAngle && a.roll === b.roll && a.zoom === b.zoom;
}

// ---------- categorical vocabulary (what we ask the LLM to return) ----------

/** Horizontal categories → hAngle. Order matters for keyword matching (more specific first). */
export const HORIZONTAL_CATEGORIES: Record<string, number> = {
  'three-quarter-left': 45,
  'three-quarter-right': -45,
  'rear-left': 135,
  'rear-right': -135,
  'front': 0,
  'left': 90,
  'right': -90,
  'back': 180,
};

/** Vertical categories → vAngle. */
export const VERTICAL_CATEGORIES: Record<string, number> = {
  'worm': -80,
  'low': -35,
  'eye': 0,
  'high': 40,
  'bird': 85,
};

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[\s_]+/g, '-').trim();

/** Resolves a horizontal value that may be a number, a category name, or free text. */
function resolveHorizontal(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = norm(v);
  if (!s) return undefined;
  const asNumber = parseFloat(s);
  if (Number.isFinite(asNumber) && /^-?\d+(\.\d+)?°?$/.test(s)) return asNumber;
  if (s in HORIZONTAL_CATEGORIES) return HORIZONTAL_CATEGORIES[s];
  return horizontalFromText(s);
}

/** Resolves a vertical value that may be a number, a category name, or free text. */
function resolveVertical(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = norm(v);
  if (!s) return undefined;
  const asNumber = parseFloat(s);
  if (Number.isFinite(asNumber) && /^-?\d+(\.\d+)?°?$/.test(s)) return asNumber;
  if (s in VERTICAL_CATEGORIES) return VERTICAL_CATEGORIES[s];
  return verticalFromText(s);
}

/** Keyword heuristics for free-text horizontal descriptions. */
function horizontalFromText(s: string): number | undefined {
  const left = /\bleft\b/.test(s);
  const right = /\bright\b/.test(s);
  if (/\b(back|behind|rear)\b/.test(s)) {
    if (left) return 135;
    if (right) return -135;
    return 180;
  }
  if (/three-quarter|3\/4|three-quarters/.test(s)) {
    if (left) return 45;
    if (right) return -45;
    return 45;
  }
  if (/\b(profile|side)\b/.test(s) || left || right) {
    if (left) return 90;
    if (right) return -90;
    return 90;
  }
  if (/\b(front|frontal|facing|head-on|straight-on)\b/.test(s)) return 0;
  return undefined;
}

/** Keyword heuristics for free-text vertical descriptions. */
function verticalFromText(s: string): number | undefined {
  if (/worm|extreme-low|ground-level/.test(s)) return -80;
  if (/bird|top-down|overhead|aerial|drone|above-looking-down|straight-down/.test(s)) return 85;
  if (/\blow\b|looking-up|from-below|upward/.test(s)) return -35;
  if (/\bhigh\b|looking-down|from-above|elevated|downward/.test(s)) return 40;
  if (/eye|level|straight/.test(s)) return 0;
  return undefined;
}

function rollFromValue(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = norm(v);
  if (!s) return 0;
  const n = parseFloat(s);
  if (Number.isFinite(n)) return n;
  if (/dutch|tilt|canted|diagonal/.test(s)) return 25;
  return 0;
}

/**
 * Parses the "Camera Angle" value coming from the LLM (decompile / MCP).
 * Accepts:
 *  - an object with categorical fields  { horizontal: "three-quarter-left", vertical: "eye", zoom: "medium" }
 *  - an object with numeric fields      { horizontal: 45, vertical: 0, roll: 0, zoom: "medium" }
 *  - a JSON string of either of the above
 *  - a free-text description ("low angle three-quarter view from the left, close-up")
 */
export function parseCameraAngleValue(raw: unknown): CameraAngleValue {
  let obj: any = raw;

  if (typeof raw === 'string') {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      obj = JSON.parse(cleaned);
    } catch {
      obj = null;
    }
    if (!obj || typeof obj !== 'object') {
      // Free text fallback: exact preset name, otherwise keyword heuristics
      const s = norm(cleaned);
      const preset = CAMERA_ANGLE_PRESETS.find(p => norm(p.name) === s);
      if (preset) {
        const { name: _n, image: _i, ...value } = preset;
        return value;
      }
      return normalizeCameraAngle({
        hAngle: horizontalFromText(s) ?? 0,
        vAngle: verticalFromText(s) ?? 0,
        roll: rollFromValue(s),
        zoom: toZoom(s),
      });
    }
  }

  if (!obj || typeof obj !== 'object') return { ...DEFAULT_CAMERA_ANGLE };

  return normalizeCameraAngle({
    hAngle: resolveHorizontal(obj.hAngle ?? obj.horizontal ?? obj.horizontalAngle ?? obj.h ?? obj.azimuth) ?? 0,
    vAngle: resolveVertical(obj.vAngle ?? obj.vertical ?? obj.verticalAngle ?? obj.v ?? obj.elevation) ?? 0,
    roll: rollFromValue(obj.roll ?? obj.tilt),
    zoom: toZoom(obj.zoom ?? obj.shot ?? obj.framing ?? obj.distance),
  });
}

// ---------- prompt text ----------

function verticalTerm(v: number): string {
  if (v >= 75) return "bird's-eye view, top-down shot";
  if (v >= 45) return 'high angle shot, looking down';
  if (v >= 15) return 'slightly elevated angle';
  if (v > -15) return 'eye-level shot';
  if (v > -45) return 'low angle shot, looking up';
  if (v > -75) return 'dramatic low angle';
  return "worm's-eye view, extreme low angle";
}

function horizontalTerm(h: number): string {
  // Positive hAngle = the subject's left side faces the camera
  const side = h > 0 ? 'left' : 'right';
  const a = Math.abs(h);
  if (a < 15) return 'frontal view';
  if (a < 60) return `three-quarter view showing the subject's ${side} side`;
  if (a < 120) return `${side} side profile view`;
  if (a < 165) return `rear three-quarter view from the subject's ${side}`;
  return 'back view, seen from behind';
}

function zoomTerm(z: ZoomLevel): string {
  switch (z) {
    case 'long': return 'long shot, wide framing';
    case 'close': return 'close-up shot';
    default: return 'medium shot';
  }
}

/** Deterministic prompt fragment describing the camera position. */
export function cameraAngleToPrompt(value: CameraAngleValue): string {
  const parts = [zoomTerm(value.zoom), verticalTerm(value.vAngle)];
  // Near the poles the horizontal direction is meaningless
  if (Math.abs(value.vAngle) < 75) parts.push(horizontalTerm(value.hAngle));
  if (Math.abs(value.roll) >= 10) {
    parts.push(`dutch angle, camera tilted ${Math.abs(value.roll)}°`);
  }
  return parts.join(', ');
}

export const formatSigned = (n: number) => `${n > 0 ? '+' : ''}${n}°`;

// ---------- 3D projection ----------

export interface Point3 { x: number; y: number; z: number; }

const D2R = Math.PI / 180;

/**
 * Rotates a point so that the "front" point (0, 0, r) lands exactly on the camera's
 * spherical position for (hAngle, vAngle). Pitch (around X) first, then yaw (around Y).
 */
export function rotateHV(p: Point3, hAngle: number, vAngle: number): Point3 {
  const b = -vAngle * D2R;
  const a = hAngle * D2R;
  const y1 = p.y * Math.cos(b) - p.z * Math.sin(b);
  const z1 = p.y * Math.sin(b) + p.z * Math.cos(b);
  const x2 = p.x * Math.cos(a) + z1 * Math.sin(a);
  const z2 = -p.x * Math.sin(a) + z1 * Math.cos(a);
  return { x: x2, y: y1, z: z2 };
}

/** Orthographic projection: screen x right, screen y down. z kept for depth sorting. */
export function project(p: Point3, cx: number, cy: number): Point3 {
  return { x: cx + p.x, y: cy - p.y, z: p.z };
}

/** Camera marker position in screen space. */
export function cameraScreenPosition(hAngle: number, vAngle: number, r: number, cx: number, cy: number): Point3 {
  return project(rotateHV({ x: 0, y: 0, z: r }, hAngle, vAngle), cx, cy);
}

const f = (n: number) => n.toFixed(1);

/**
 * Builds SVG path strings for a wireframe sphere (meridians every 30°, parallels every 30°),
 * rotated by (hAngle, vAngle). Front-facing segments and back-facing segments are returned separately
 * so they can be styled with different opacity.
 */
export function buildSpherePaths(hAngle: number, vAngle: number, r: number, cx: number, cy: number, steps = 48): { front: string; back: string } {
  const circles: Point3[][] = [];

  // Meridians (great circles through the poles)
  for (let lon = 0; lon < 180; lon += 30) {
    const l = lon * D2R;
    const pts: Point3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      pts.push({ x: r * Math.cos(t) * Math.sin(l), y: r * Math.sin(t), z: r * Math.cos(t) * Math.cos(l) });
    }
    circles.push(pts);
  }

  // Parallels (latitude rings)
  for (let lat = -60; lat <= 60; lat += 30) {
    const la = lat * D2R;
    const pts: Point3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      pts.push({ x: r * Math.cos(la) * Math.sin(t), y: r * Math.sin(la), z: r * Math.cos(la) * Math.cos(t) });
    }
    circles.push(pts);
  }

  let front = '';
  let back = '';

  for (const circle of circles) {
    const projected = circle.map(p => project(rotateHV(p, hAngle, vAngle), cx, cy));
    for (let i = 0; i < projected.length - 1; i++) {
      const a = projected[i];
      const b = projected[i + 1];
      const seg = `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
      if (a.z + b.z >= 0) front += seg; else back += seg;
    }
  }

  return { front, back };
}
