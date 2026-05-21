import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Terminal, Sparkles } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

export function OutputNode({ id, data }: { id: string, data: any }) {
  const { updateNodeData } = useReactFlow();
  const [loading, setLoading] = useState(false);

  const handleReview = async () => {
    if (!data.prompt) return;
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3001/api/review', { prompt: data.prompt });
      if (res.data.refined) {
        updateNodeData(id, { prompt: res.data.refined });
      }
    } catch (e: any) {
      console.error("Failed to review prompt:", e);
      alert(e.response?.data?.error || "Failed to review prompt. Make sure LM Studio Local Server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-node" style={{ minWidth: '350px', borderColor: 'var(--accent)' }}>
      <Handle type="target" position={Position.Left} />
      <div className="node-header text-indigo-400 flex justify-between items-center">
        <div className="flex items-center gap-2"><Terminal size={14} /> Final Prompt</div>
        <button 
           onClick={handleReview} 
           disabled={loading || !data.prompt}
           className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors flex items-center gap-1 text-xs"
           title="Уточнити та перевірити весь промпт через ШІ"
         >
           <Sparkles size={14} className={loading ? "animate-spin" : ""} /> Review
         </button>
      </div>
      <div className="node-content mt-2">
        <textarea 
          readOnly
          rows={6}
          value={data.prompt || 'Connect nodes to generate a prompt...'}
          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200 resize-y min-h-[100px]"
        />
        <button className="btn-primary mt-3 w-full" onClick={() => navigator.clipboard.writeText(data.prompt)}>
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}
