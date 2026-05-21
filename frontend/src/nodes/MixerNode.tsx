import { useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, useNodeId } from '@xyflow/react';
import axios from 'axios';

export function MixerNode({ data }: any) {
  const nodeId = useNodeId();
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  
  const [mode, setMode] = useState<string>(data.mode || 'concat');
  const [isMerging, setIsMerging] = useState(false);
  const [llmResult, setLlmResult] = useState<string>(data.llmResult || '');

  useEffect(() => {
    updateNodeData(nodeId!, { mode, llmResult });
  }, [mode, llmResult, nodeId, updateNodeData]);

  // A helper to recursively get incoming texts just like App.tsx does
  const getIncomingTexts = useCallback((): string[] => {
    const nodes = getNodes();
    const edges = getEdges();

    const evaluateNode = (id: string, visited: Set<string> = new Set()): string => {
      if (visited.has(id)) return '';
      visited.add(id);

      const node = nodes.find(n => n.id === id);
      if (!node) return '';

      const incomingEdges = edges.filter(e => e.target === id);
      const incomingTexts = incomingEdges.map(e => evaluateNode(e.source, new Set(visited))).filter(t => t !== '');

      let ownText = '';
      if (node.type === 'inputNode') ownText = node.data?.text as string || '';
      else if (node.type === 'component') ownText = node.data?.value as string || '';
      else if (node.type === 'imageVisionNode') ownText = node.data?.text as string || '';
      // We don't apply weights here for the LLM merge, we just want the raw concepts

      if (incomingTexts.length > 0) {
        if (ownText) return incomingTexts.join(', ') + ', ' + ownText;
        return incomingTexts.join(', ');
      }
      return ownText;
    };

    const incomingEdges = edges.filter(e => e.target === nodeId);
    return incomingEdges.map(e => evaluateNode(e.source)).filter(t => t !== '');
  }, [nodeId, getNodes, getEdges]);

  const handleLlmMerge = async () => {
    const texts = getIncomingTexts();
    if (texts.length === 0) {
      alert("No incoming nodes to merge!");
      return;
    }

    setIsMerging(true);
    try {
      const res = await axios.post('http://127.0.0.1:3001/api/merge-prompts', { prompts: texts });
      if (res.data && res.data.merged) {
        setLlmResult(res.data.merged);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.error || "Failed to merge via LLM.");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="custom-node" style={{ width: '256px' }}>
      <Handle type="target" position={Position.Left} />
      
      <div className="node-header text-primary mb-3">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        Mixer Node
      </div>

      <div className="node-content mb-3">
        <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Merge Mode</label>
        <select 
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            if (e.target.value !== 'llm') setLlmResult('');
          }}
        >
          <option value="concat">Concat (A, B)</option>
          <option value="mj">Midjourney (A ::1 B ::1)</option>
          <option value="sd">Stable Diffusion (A AND B)</option>
          <option value="llm">LLM Smart Merge</option>
        </select>
      </div>

      {mode === 'llm' && (
        <div className="node-content mt-4 border-t border-border pt-3">
          <button 
            onClick={handleLlmMerge}
            disabled={isMerging}
            className="btn-primary flex justify-center items-center gap-2 mb-2"
          >
            {isMerging ? 'Merging...' : 'Trigger LLM Merge'}
          </button>
          
          {llmResult && (
            <textarea 
              rows={3}
              value={llmResult}
              readOnly
            />
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
