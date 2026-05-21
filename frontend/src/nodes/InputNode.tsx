import { Handle, Position } from '@xyflow/react';
import { Type, Bot } from 'lucide-react';

export function InputNode({ data }: { data: any }) {
  return (
    <div className="custom-node" style={{ borderColor: 'var(--accent)' }}>
      <div className="node-header text-indigo-400">
        <Type size={14} /> Base Input
      </div>
      <div className="node-content flex flex-col gap-3">
        <textarea 
          placeholder="Initial prompt text..." 
          rows={3}
          value={data.text || ''}
          onChange={(e) => data.onChange && data.onChange('text', e.target.value)}
        />
        <div className="bg-gray-800 rounded-md p-3 text-xs text-gray-400 flex items-center gap-2">
          <Bot size={16} className="text-indigo-400" />
          <span>Ask Gemma in LM Studio to decompile an image to populate this pipeline!</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
