import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Terminal, Sparkles } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

const ENGINES = [
  "Midjourney", 
  "Stable Diffusion", 
  "DALL-E", 
  "Veo", 
  "Sora",
  "Ideogram",
  "Nano banana", 
  "GPT Image", 
  "Flux", 
  "Qwen", 
  "Z _image"
];

export function OutputNode({ id, data }: { id: string, data: any }) {
  const { updateNodeData } = useReactFlow();
  const [loading, setLoading] = useState(false);

  const engine = data.engine || 'Midjourney';
  const format = data.format || 'Plain Text';

  const handleOptimize = async () => {
    if (!data.prompt) return;
    setLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:3001/api/optimize-prompt', { 
        prompt: data.prompt,
        engine,
        format
      });
      if (res.data.optimized) {
        updateNodeData(id, { optimizedText: res.data.optimized });
      }
    } catch (e: any) {
      console.error("Failed to optimize prompt:", e);
      alert(e.response?.data?.error || "Failed to optimize prompt. Make sure LM Studio Local Server is running.");
    } finally {
      setLoading(false);
    }
  };

  const displayText = data.optimizedText || data.prompt || 'Connect nodes to generate a prompt...';

  return (
    <div className="custom-node border-primary" style={{ minWidth: '350px' }}>
      <Handle type="target" position={Position.Left} />
      
      <div className="node-header text-primary flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
          <Terminal size={14} /> Final Prompt
        </div>
        <button 
           onClick={handleOptimize} 
           disabled={loading || !data.prompt}
           className="text-primary hover:text-primary/80 disabled:opacity-50 transition-colors flex items-center gap-1 text-xs font-semibold"
           title="Оптимізувати промпт"
         >
           <Sparkles size={14} className={loading ? "animate-spin" : ""} /> {loading ? "Optimizing..." : "Optimize"}
         </button>
      </div>

      <div className="node-content flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Target Engine</label>
          <select 
            value={engine}
            onChange={(e) => updateNodeData(id, { engine: e.target.value, optimizedText: '' })}
            className="w-full text-xs py-1"
          >
            {ENGINES.map(eng => <option key={eng} value={eng}>{eng}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Format</label>
          <select 
            value={format}
            onChange={(e) => updateNodeData(id, { format: e.target.value, optimizedText: '' })}
            className="w-full text-xs py-1"
          >
            <option value="Plain Text">Plain Text</option>
            <option value="JSON">JSON</option>
          </select>
        </div>
      </div>

      <div className="node-content mt-2 border-t border-border pt-3">
        {data.optimizedText && (
          <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">
            Optimized
          </div>
        )}
        <textarea 
          readOnly
          rows={8}
          value={displayText}
          className={`resize-y min-h-[100px] ${data.optimizedText ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/20' : ''}`}
        />
        <button className="btn-primary mt-3 w-full" onClick={() => navigator.clipboard.writeText(displayText)}>
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}
