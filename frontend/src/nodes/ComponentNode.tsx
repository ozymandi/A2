import { Handle, Position } from '@xyflow/react';
import { Settings2 } from 'lucide-react';

export function ComponentNode({ data }: { data: any }) {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <Settings2 size={14} /> {data.label || 'Component'}
      </div>
      <div className="node-content">
        <input 
          type="text"
          value={data.value || ''}
          placeholder={`Enter ${data.label || 'value'}...`}
          onChange={(e) => data.onChange && data.onChange('value', e.target.value)}
        />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
