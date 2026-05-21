import { Handle, Position } from '@xyflow/react';
import { Terminal } from 'lucide-react';

export function OutputNode({ data }: { data: any }) {
  return (
    <div className="custom-node" style={{ minWidth: '300px', borderColor: 'var(--accent)' }}>
      <Handle type="target" position={Position.Left} />
      <div className="node-header text-indigo-400">
        <Terminal size={14} /> Final Prompt
      </div>
      <div className="node-content">
        <textarea 
          readOnly
          rows={5}
          value={data.prompt || 'Connect nodes to generate a prompt...'}
          className="bg-gray-900 border-gray-700 text-gray-200"
        />
        <button className="btn-primary" onClick={() => navigator.clipboard.writeText(data.prompt)}>
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}
