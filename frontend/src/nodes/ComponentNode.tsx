import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Settings2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

export function ComponentNode({ id, data }: { id: string, data: any }) {
  const { updateNodeData, setNodes } = useReactFlow();
  const [loading, setLoading] = useState(false);

  const handleRefine = async () => {
    setLoading(true);
    try {
       const res = await axios.post('http://localhost:3001/api/refine', { 
           label: data.label || 'component', 
           value: data.value 
       });
       if (res.data.refined) {
           updateNodeData(id, { value: res.data.refined });
       }
    } catch (e) {
       console.error("Failed to refine:", e);
    } finally {
       setLoading(false);
    }
  };

  const handleDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
  };

  return (
    <div className="custom-node group">
      <Handle type="target" position={Position.Left} />
      <div className="node-header flex justify-between items-center w-full">
         <div className="flex items-center gap-2">
            <Settings2 size={14} /> 
            {data.number && <span className="text-gray-500 font-mono text-[10px]">#{data.number}</span>}
            {data.label || 'Component'}
         </div>
         <div className="flex items-center gap-2">
           <button 
             onClick={handleRefine} 
             disabled={loading}
             className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
             title="Уточнити через AI"
           >
             <Sparkles size={14} className={loading ? "animate-spin" : ""} />
           </button>
           <button 
             onClick={handleDelete}
             className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
             title="Видалити ноду"
           >
             ✕
           </button>
         </div>
      </div>
      <div className="node-content mt-2">
        <textarea 
          value={data.value || ''}
          placeholder={`Enter ${data.label || 'value'}...`}
          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 resize-y min-h-[40px] max-w-[250px]"
          onChange={(e) => updateNodeData(id, { value: e.target.value })}
        />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
