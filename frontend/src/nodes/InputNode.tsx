import { Handle, Position } from '@xyflow/react';
import { Type, Bot } from 'lucide-react';

export function InputNode() {
  return (
    <div className="custom-node border-primary">
      <div className="node-header text-primary">
        <Type size={14} /> Base Input
      </div>
      <div className="node-content flex flex-col gap-3">
        <div className="bg-input-background rounded-md p-3 text-xs text-muted-foreground flex items-center gap-2 border border-border">
          <Bot size={16} className="text-primary flex-shrink-0" />
          <span>Ask Gemma in LM Studio to decompile an image to populate this pipeline!</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
