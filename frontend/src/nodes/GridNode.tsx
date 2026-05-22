import { Handle, Position, useReactFlow } from '@xyflow/react';
import { LayoutGrid, Download, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

interface GridRect {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export function GridNode({ id, data }: { id: string, data: any }) {
  const { updateNodeData } = useReactFlow();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const rects: GridRect[] = data.rects || [];

  const generateGrid = async () => {
    setIsGenerating(true);
    const textToAnalyze = data.incomingText || "A simple placeholder scene";
    try {
      const res = await axios.post('http://127.0.0.1:3001/api/generate-grid', { text: textToAnalyze });
      if (res.data && res.data.rects) {
        updateNodeData(id, { rects: res.data.rects });
      }
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to generate grid. Make sure LM Studio is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getSvgContent = () => {
    // We create a standard 800x600 viewBox for the downloaded SVG to have decent resolution
    const width = 800;
    const height = 600;
    
    let rectsSvg = rects.map((r, i) => {
      const rw = (r.width / 100) * width;
      const rh = (r.height / 100) * height;
      const rx = (r.x / 100) * width;
      const ry = (r.y / 100) * height;
      const color = r.color || `hsl(${(i * 137.5) % 360}, 70%, 50%)`;
      
      return `
        <g transform="translate(${rx}, ${ry})">
          <rect width="${rw}" height="${rh}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="3" rx="4" />
          <text x="8" y="24" fill="${color}" font-family="sans-serif" font-size="16" font-weight="bold">${r.label}</text>
        </g>
      `;
    }).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #121212;">
      ${rectsSvg}
    </svg>`;
  };

  const exportSvg = () => {
    if (rects.length === 0) return;
    const svgStr = getSvgContent();
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `composition-grid.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="custom-node border-primary" style={{ width: '320px' }}>
      <Handle type="target" position={Position.Left} />
      
      <div className="flex justify-between items-center mb-3">
        <div className="node-header text-primary mb-0">
          <LayoutGrid className="w-4 h-4 mr-2" />
          <span className="font-bold tracking-wider text-xs">COMPOSITION GRID</span>
        </div>
        <button 
          onClick={generateGrid}
          disabled={isGenerating}
          className="p-1.5 hover:bg-input-background rounded-md transition-colors text-primary disabled:opacity-50 border border-transparent hover:border-border"
          title="Regenerate Grid from incoming text"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="node-content bg-input-background rounded-lg border border-border p-2 mb-3">
        {rects.length > 0 ? (
          <div className="relative w-full aspect-video rounded overflow-hidden bg-black/20 border border-black/40">
            {rects.map((r, i) => {
              const color = r.color || `hsl(${(i * 137.5) % 360}, 70%, 50%)`;
              return (
                <div 
                  key={i}
                  className="absolute border-2 rounded-sm flex items-start justify-start p-1 overflow-hidden"
                  style={{
                    left: `${r.x}%`,
                    top: `${r.y}%`,
                    width: `${r.width}%`,
                    height: `${r.height}%`,
                    borderColor: color,
                    backgroundColor: `${color}22` // 22 is ~13% opacity in hex
                  }}
                  title={`${r.label} (${r.x}%,${r.y}%) ${r.width}%x${r.height}%`}
                >
                  <span className="text-[9px] font-bold tracking-wider uppercase truncate drop-shadow-md" style={{ color: color }}>
                    {r.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground py-8 italic border border-dashed border-muted-foreground/30 rounded">
            Click generate to analyze composition
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={exportSvg}
          disabled={rects.length === 0}
          className="flex-1 text-xs py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download className="w-3 h-3" /> .SVG
        </button>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
