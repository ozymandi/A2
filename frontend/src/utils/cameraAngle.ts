// Camera Angle node: data model, presets, prompt text mapping and 3D→2D sphere projection.
//
// Conventions:
//   hAngle  -180..180  horizontal orbit. 0 = camera in front of the subject,
//                      positive = camera moves to the viewer's right, ±90 = side profile, ±180 = behind.
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

export const CAMERA_ANGLE_PRESETS: CameraAnglePreset[] = [
  { name: 'Eye Level',   hAngle: 0,    vAngle: 0,   roll: 0,  zoom: 'medium' },
  { name: 'Close-up',    hAngle: 0,    vAngle: 0,   roll: 0,  zoom: 'close' },
  { name: 'Low Angle',   hAngle: 0,    vAngle: -40, roll: 0,  zoom: 'medium' },
  { name: 'High Angle',  hAngle: 0,    vAngle: 45,  roll: 0,  zoom: 'medium' },
  { name: "Bird's Eye",  hAngle: 0,    vAngle: 85,  roll: 0,  zoom: 'long' },
  { name: 'Left Side',   hAngle: -90,  vAngle: 0,   roll: 0,  zoom: 'medium' },
  { name: 'Right Side',  hAngle: 90,   vAngle: 0,   roll: 0,  zoom: 'medium' },
  { name: 'Back View',   hAngle: 180,  vAngle: 10,  roll: 0,  zoom: 'medium' },
  { name: 'Dutch Angle', hAngle: 20,   vAngle: -10, roll: 25, zoom: 'medium' },
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
  if (s.startsWith('long') || s.includes('wide') || s.includes('full')) return 'long';
  if (s.startsWith('close')) return 'close';
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

/**
 * Parses the "Camera Angle" value coming from the LLM (decompile / MCP).
 * Accepts an object, a JSON string, or a free-text description (matched against preset names).
 */
export function parseCameraAngleValue(raw: unknown): CameraAngleValue {
  let obj: any = raw;

  if (typeof raw === 'string') {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      obj = JSON.parse(cleaned);
    } catch {
      // Free text fallback: try to match a preset name inside the text
      const lower = cleaned.toLowerCase();
      const preset = CAMERA_ANGLE_PRESETS.find(p => lower.includes(p.name.toLowerCase()));
      if (preset) {
        const { name: _n, image: _i, ...value } = preset;
        return value;
      }
      return { ...DEFAULT_CAMERA_ANGLE, zoom: toZoom(lower) };
    }
  }

  if (!obj || typeof obj !== 'object') return { ...DEFAULT_CAMERA_ANGLE };

  return normalizeCameraAngle({
    hAngle: obj.hAngle ?? obj.horizontal ?? obj.horizontalAngle ?? obj.h,
    vAngle: obj.vAngle ?? obj.vertical ?? obj.verticalAngle ?? obj.v,
    roll: obj.roll ?? obj.tilt ?? 0,
    zoom: toZoom(obj.zoom ?? obj.shot ?? obj.framing),
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
  const side = h < 0 ? 'left' : 'right';
  const a = Math.abs(h);
  if (a < 15) return 'frontal view';
  if (a < 60) return `three-quarter view from the ${side}`;
  if (a < 120) return `${side} side profile view`;
  if (a < 165) return `rear three-quarter view from the ${side}`;
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
