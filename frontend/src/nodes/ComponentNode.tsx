import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Settings2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { NODE_PRESETS } from '../constants/presets';
import type { PresetItem } from '../constants/presets';

export function ComponentNode({ id, data }: { id: string, data: any }) {
  const { updateNodeData, setNodes } = useReactFlow();
  const [loading, setLoading] = useState(false);

  const presetsForCategory = data.label ? NODE_PRESETS[data.label] || [] : [];
  const presetValue = data.preset || (data.value ? 'Custom' : 'None');

  // Flatten presets for checking if a value exists
  const flatPresets = presetsForCategory.reduce((acc: string[], curr: PresetItem) => {
    if (typeof curr === 'string') {
      acc.push(curr);
    } else {
      acc.push(...curr.items);
    }
    return acc;
  }, []);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPreset = e.target.value;
    if (newPreset === 'None') {
      updateNodeData(id, { preset: 'None', value: '' });
    } else if (newPreset === 'Custom') {
      updateNodeData(id, { preset: 'Custom' });
    } else {
      updateNodeData(id, { preset: newPreset, value: newPreset }); // The preset name is the prompt value
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const isKnownPreset = flatPresets.includes(newValue);
    updateNodeData(id, { 
      value: newValue, 
      preset: isKnownPreset ? newValue : (newValue ? 'Custom' : 'None') 
    });
  };

  const handleRefine = async () => {
    setLoading(true);
    try {
       const res = await axios.post('http://127.0.0.1:3001/api/refine', { 
           label: data.label || 'component', 
           value: data.value 
       });
       if (res.data.refined) {
           updateNodeData(id, { value: res.data.refined, preset: 'Custom' });
       }
    } catch (e: any) {
       console.error("Failed to refine:", e);
       alert(e.response?.data?.error || "Failed to refine prompt. Make sure LM Studio Local Server is running.");
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
            {data.number && <span className="text-muted-foreground font-mono text-[10px]">#{data.number}</span>}
            {data.label || 'Component'}
         </div>
         <div className="flex items-center gap-2">
           <button 
             onClick={handleRefine} 
             disabled={loading}
             className="text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
             title="Уточнити через AI"
           >
             <Sparkles size={14} className={loading ? "animate-spin" : ""} />
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
      <div className="node-content mt-2 flex flex-col gap-2">
        {presetsForCategory.length > 0 && (
          <select 
            value={presetValue} 
            onChange={handlePresetChange}
            className="w-full text-xs py-1"
          >
            <option value="None">None</option>
            <option value="Custom">Custom</option>
            {presetsForCategory.map((p, i) => {
              if (typeof p === 'string') {
                return <option key={i} value={p}>{p}</option>;
              } else {
                return (
                  <optgroup key={i} label={p.groupName}>
                    {p.items.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </optgroup>
                );
              }
            })}
          </select>
        )}
        <textarea 
          value={data.value || ''}
          placeholder={`Enter ${data.label || 'value'}...`}
          className="resize-y min-h-[40px] max-w-[250px] w-full"
          onChange={handleValueChange}
        />
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Weight</span>
          <input 
            type="range" 
            min="0.1" max="2.0" step="0.1" 
            value={data.weight ?? 1.0} 
            onChange={(e) => updateNodeData(id, { weight: parseFloat(e.target.value) })}
            className="flex-1 h-1 bg-primary/50 rounded-lg appearance-none cursor-pointer"
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
