import { Handle, Position, useReactFlow, useNodeConnections, useNodesData } from '@xyflow/react';
import { Orbit, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  CAMERA_ANGLE_PRESETS,
  DEFAULT_CAMERA_ANGLE,
  ZOOM_LABELS,
  ZOOM_LEVELS,
  buildSpherePaths,
  cameraAngleToPrompt,
  cameraScreenPosition,
  formatSigned,
  isSameAngle,
  normalizeCameraAngle,
  wrapAngle,
} from '../utils/cameraAngle';
import type { CameraAnglePreset, CameraAngleValue, ZoomLevel } from '../utils/cameraAngle';

// Sphere viewport geometry
const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 88;
const CAMERA_ORBIT = R * 1.18;
const THUMB = 64;
const DRAG_DEG_PER_PX = 0.5;

/** Small schematic used for presets when no preview image is provided. */
function PresetPictogram({ preset }: { preset: CameraAnglePreset }) {
  const s = 44;
  const cx = s / 2;
  const cy = s / 2;
  const r = 14;
  const cam = cameraScreenPosition(preset.hAngle, preset.vAngle, r * 1.3, cx, cy);
  const behind = cam.z < 0;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="block">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="1" />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.35} fill="none" stroke="var(--border)" strokeWidth="0.75" />
      <g transform={`rotate(${preset.roll} ${cx} ${cy})`}>
        <rect x={cx - 5} y={cy - 5} width="10" height="10" rx="2" fill="var(--muted-foreground)" />
      </g>
      <circle
        cx={cam.x}
        cy={cam.y}
        r={preset.zoom === 'close' ? 4 : preset.zoom === 'long' ? 2.2 : 3}
        fill="var(--primary)"
        opacity={behind ? 0.45 : 1}
      />
    </svg>
  );
}

function CameraMarker({ x, y, z, roll }: { x: number; y: number; z: number; roll: number }) {
  const depth = (z / CAMERA_ORBIT + 1) / 2; // 0 (far) .. 1 (near)
  const scale = 0.75 + 0.35 * depth;
  const opacity = z >= 0 ? 1 : 0.4;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${roll}) scale(${scale.toFixed(2)})`} opacity={opacity}>
      <rect x="-11" y="-7" width="22" height="14" rx="3" fill="var(--card)" stroke="var(--foreground)" strokeWidth="1.5" />
      <rect x="-5" y="-10" width="8" height="4" rx="1" fill="var(--card)" stroke="var(--foreground)" strokeWidth="1.5" />
      <circle cx="1" cy="0" r="4" fill="none" stroke="var(--foreground)" strokeWidth="1.5" />
    </g>
  );
}

function SubjectPlaceholder() {
  return (
    <g>
      <rect x={CX - THUMB / 2} y={CY - THUMB / 2} width={THUMB} height={THUMB} rx="10" fill="var(--input-background)" stroke="var(--border)" />
      <circle cx={CX} cy={CY - 10} r="11" fill="var(--muted-foreground)" />
      <path d={`M${CX - 22} ${CY + 26} a22 20 0 0 1 44 0 z`} fill="var(--muted-foreground)" />
    </g>
  );
}

export function CameraAngleNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData, setNodes } = useReactFlow();
  const value: CameraAngleValue = useMemo(() => normalizeCameraAngle(data), [data]);

  // Thumbnail: first upstream node that carries an image (ImageVisionNode)
  const connections = useNodeConnections({ id, handleType: 'target' });
  const sourceIds = useMemo(() => connections.map(c => c.source), [connections]);
  const sourceNodes = useNodesData(sourceIds);
  const thumbnail: string | null = (sourceNodes.find(n => typeof n?.data?.image === 'string')?.data?.image as string) || null;

  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; h: number; v: number } | null>(null);

  const setValue = (patch: Partial<CameraAngleValue>) => {
    const next = normalizeCameraAngle({ ...value, ...patch });
    updateNodeData(id, { ...next, preset: CAMERA_ANGLE_PRESETS.find(p => isSameAngle(p, next))?.name ?? 'Custom' });
  };

  const applyPreset = (p: CameraAnglePreset) => {
    updateNodeData(id, { hAngle: p.hAngle, vAngle: p.vAngle, roll: p.roll, zoom: p.zoom, preset: p.name });
  };

  const reset = () => setValue(DEFAULT_CAMERA_ANGLE);

  const handleDelete = () => setNodes(nds => nds.filter(n => n.id !== id));

  // --- sphere drag ---
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.stopPropagation();
    (e.target as Element).closest('svg')?.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, h: value.hAngle, v: value.vAngle };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setValue({
      hAngle: wrapAngle(dragStart.current.h + dx * DRAG_DEG_PER_PX),
      vAngle: dragStart.current.v - dy * DRAG_DEG_PER_PX,
    });
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragStart.current = null;
    setDragging(false);
    try { (e.target as Element).closest('svg')?.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };

  const paths = useMemo(() => buildSpherePaths(value.hAngle, value.vAngle, R, CX, CY), [value.hAngle, value.vAngle]);
  const cam = useMemo(() => cameraScreenPosition(value.hAngle, value.vAngle, CAMERA_ORBIT, CX, CY), [value.hAngle, value.vAngle]);
  const cameraBehind = cam.z < 0;

  const promptText = cameraAngleToPrompt(value);
  const isDefault = isSameAngle(value, DEFAULT_CAMERA_ANGLE);

  return (
    <div className="custom-node group" style={{ width: '340px' }}>
      <Handle type="target" position={Position.Left} />

      <div className="node-header flex justify-between items-center w-full">
        <div className="flex items-center gap-2">
          <Orbit size={14} />
          {data.number && <span className="text-muted-foreground font-mono text-[10px]">#{data.number}</span>}
          Camera Angle
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            disabled={isDefault}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors normal-case tracking-normal"
            title="Reset to Eye Level"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            title="Видалити ноду"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="node-content mt-2 flex flex-col gap-3">
        {/* Sphere manipulator */}
        <div className="bg-input-background rounded-lg border border-border flex justify-center">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className={`nodrag nopan select-none touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <defs>
              <clipPath id={`thumb-clip-${id}`}>
                <rect x={CX - THUMB / 2} y={CY - THUMB / 2} width={THUMB} height={THUMB} rx="10" />
              </clipPath>
            </defs>

            <path d={paths.back} fill="none" stroke="var(--muted-foreground)" strokeWidth="0.6" opacity="0.3" />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--muted-foreground)" strokeWidth="0.8" opacity="0.5" />
            <path d={paths.front} fill="none" stroke="var(--muted-foreground)" strokeWidth="1" opacity="0.85" />

            {cameraBehind && <CameraMarker x={cam.x} y={cam.y} z={cam.z} roll={value.roll} />}

            {thumbnail ? (
              <image
                href={thumbnail}
                x={CX - THUMB / 2}
                y={CY - THUMB / 2}
                width={THUMB}
                height={THUMB}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#thumb-clip-${id})`}
              />
            ) : (
              <SubjectPlaceholder />
            )}

            {!cameraBehind && <CameraMarker x={cam.x} y={cam.y} z={cam.z} roll={value.roll} />}
          </svg>
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              <span>Horizontal Angle</span>
              <span className="font-mono text-foreground">{formatSigned(value.hAngle)}</span>
            </div>
            <input
              type="range" min="-180" max="180" step="1"
              value={value.hAngle}
              onChange={e => setValue({ hAngle: parseInt(e.target.value, 10) })}
              className="nodrag w-full h-1 bg-primary/50 rounded-lg appearance-none cursor-pointer"
            />
          </label>
          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              <span>Vertical Angle</span>
              <span className="font-mono text-foreground">{formatSigned(value.vAngle)}</span>
            </div>
            <input
              type="range" min="-90" max="90" step="1"
              value={value.vAngle}
              onChange={e => setValue({ vAngle: parseInt(e.target.value, 10) })}
              className="nodrag w-full h-1 bg-primary/50 rounded-lg appearance-none cursor-pointer"
            />
          </label>
        </div>

        {/* Zoom */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Zoom</span>
          <div className="flex bg-input-background border border-border rounded-md p-0.5 gap-0.5">
            {ZOOM_LEVELS.map((z: ZoomLevel) => (
              <button
                key={z}
                onClick={() => setValue({ zoom: z })}
                className={`flex-1 text-[11px] py-1.5 rounded transition-colors ${
                  value.zoom === z
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                {ZOOM_LABELS[z]}
              </button>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Angle presets</span>
          <div className="grid grid-cols-3 gap-1.5">
            {CAMERA_ANGLE_PRESETS.map(p => {
              const active = isSameAngle(p, value);
              return (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-md border transition-colors ${
                    active
                      ? 'bg-primary/20 border-primary/40'
                      : 'bg-input-background border-border hover:border-primary/50'
                  }`}
                  title={cameraAngleToPrompt(p)}
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-11 h-11 rounded object-cover" draggable={false} />
                  ) : (
                    <PresetPictogram preset={p} />
                  )}
                  <span className={`text-[10px] leading-tight ${active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resulting prompt fragment */}
        <div className="text-[11px] text-muted-foreground italic border-t border-border pt-2 leading-snug">
          {promptText}
        </div>

        {/* Weight */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Weight</span>
          <input
            type="range"
            min="0.1" max="2.0" step="0.1"
            value={data.weight ?? 1.0}
            onChange={e => updateNodeData(id, { weight: parseFloat(e.target.value) })}
            className="nodrag flex-1 h-1 bg-primary/50 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">
            {Number(data.weight ?? 1.0).toFixed(1)}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
