import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Palette, Copy, Download, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { generateAseFile, downloadBlob } from '../utils/aseExport';

export function PaletteNode({ id, data }: { id: string, data: any }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { updateNodeData } = useReactFlow();
  
  // Internal state for the UI, derived from data or defaults to empty
  const [colors, setColors] = useState<string[]>(data.colors || []);

  useEffect(() => {
    if (data.colors && JSON.stringify(data.colors) !== JSON.stringify(colors)) {
      setColors(data.colors);
    }
  }, [data.colors]);

  const generatePalette = async () => {
    const textToAnalyze = data.incomingText || "Random beautiful aesthetic";
    setIsGenerating(true);
    try {
      const res = await axios.post('http://127.0.0.1:3001/api/generate-palette', { text: textToAnalyze });
      if (res.data && res.data.colors) {
        setColors(res.data.colors);
        updateNodeData(id, { colors: res.data.colors });
      }
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.error || "Failed to generate palette. Make sure LM Studio is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(colors, null, 2));
    alert("Palette JSON copied to clipboard!");
  };

  const exportAse = () => {
    if (colors.length === 0) return;
    const blob = generateAseFile(colors);
    downloadBlob(blob, "palette.ase");
  };

  return (
    <div className="custom-node border-primary" style={{ width: '280px' }}>
      <Handle type="target" position={Position.Left} />
      
      <div className="flex justify-between items-center mb-3">
        <div className="node-header text-primary mb-0">
          <Palette className="w-4 h-4 mr-2" />
          <span className="font-bold tracking-wider text-xs">COLOR PALETTE</span>
        </div>
        <button 
          onClick={generatePalette}
          disabled={isGenerating}
          className="p-1.5 hover:bg-input-background rounded-md transition-colors text-primary disabled:opacity-50 border border-transparent hover:border-border"
          title="Regenerate Palette from incoming nodes"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="node-content bg-input-background rounded-lg border border-border p-3 mb-3">
        {colors.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex h-12 rounded-md overflow-hidden shadow-inner">
              {colors.map((hex, i) => (
                <div 
                  key={i} 
                  className="flex-1 cursor-pointer transition-transform hover:scale-110 hover:z-10 relative group"
                  style={{ backgroundColor: hex }}
                  onClick={() => copyHex(hex)}
                  title={`Copy ${hex}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-sm transition-opacity">
                    <Copy className="w-3 h-3 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground py-4 italic">
            Click generate to extract palette
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={copyJson}
          disabled={colors.length === 0}
          className="flex-1 text-xs py-2 bg-input-background hover:bg-background border border-border rounded-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-foreground"
        >
          <Copy className="w-3 h-3" /> JSON
        </button>
        <button 
          onClick={exportAse}
          disabled={colors.length === 0}
          className="flex-1 text-xs py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download className="w-3 h-3" /> .ASE
        </button>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
