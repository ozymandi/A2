import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  SelectionMode
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { doIntersect } from './utils/math';
import { NODE_PRESETS } from './constants/presets';
import type { PresetItem } from './constants/presets';

import { InputNode } from './nodes/InputNode';
import { ComponentNode } from './nodes/ComponentNode';
import { OutputNode } from './nodes/OutputNode';
import { ImageVisionNode } from './nodes/ImageVisionNode';
import { MixerNode } from './nodes/MixerNode';
import { PaletteNode } from './nodes/PaletteNode';
import { GridNode } from './nodes/GridNode';
import { Sidebar } from './Sidebar';
import { useUndoRedo } from './hooks/useUndoRedo';

const nodeTypes = {
  inputNode: InputNode,
  component: ComponentNode,
  outputNode: OutputNode,
  imageVisionNode: ImageVisionNode,
  mixerNode: MixerNode,
  paletteNode: PaletteNode,
  gridNode: GridNode,
};

const initialNodes: Node[] = [
  { id: '1', type: 'inputNode', position: { x: 50, y: 150 }, data: { text: '' } },
  { id: '2', type: 'outputNode', position: { x: 450, y: 150 }, data: { prompt: '' } },
];
const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
];

let id = 0;
const getId = () => `dndnode_${id++}`;
let globalNodeCounter = 1;

export default function App() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  // Cut line state
  const [cutLine, setCutLine] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
  const isCuttingRef = useRef(false);

  const { undo, redo, takeSnapshotDebounced, canUndo, canRedo } = useUndoRedo(nodes, edges, setNodes, setEdges);

  // Debounced snapshot on every change
  useEffect(() => {
    takeSnapshotDebounced();
  }, [nodes, edges, takeSnapshotDebounced]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'f' || e.key === 'F') {
        if (reactFlowInstance) {
          const selectedNodes = reactFlowInstance.getNodes().filter((n: Node) => n.selected);
          if (selectedNodes.length === 2) {
            e.preventDefault();
            const [node1, node2] = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
            const newEdge = { id: `e_${node1.id}_${node2.id}`, source: node1.id, target: node2.id };
            setEdges(eds => addEdge(newEdge, eds));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, reactFlowInstance, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.ctrlKey && e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      isCuttingRef.current = true;
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCutLine({ start: { x, y }, end: { x, y } });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isCuttingRef.current && reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCutLine(prev => prev ? { ...prev, end: { x, y } } : null);
    }
  };

  const handlePointerUp = () => {
    if (isCuttingRef.current && cutLine && reactFlowInstance) {
      isCuttingRef.current = false;
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (!rect) return;

      const startFlow = reactFlowInstance.screenToFlowPosition({ x: cutLine.start.x + rect.left, y: cutLine.start.y + rect.top });
      const endFlow = reactFlowInstance.screenToFlowPosition({ x: cutLine.end.x + rect.left, y: cutLine.end.y + rect.top });

      const edgesToRemove: string[] = [];
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
          // Approximate the connection line. React Flow's actual bezier path is complex,
          // but a straight line between the node centers or handles is usually a good enough proxy for cutting.
          const p1 = { x: sourceNode.position.x + 200, y: sourceNode.position.y + 50 };
          const p2 = { x: targetNode.position.x, y: targetNode.position.y + 50 };
          if (doIntersect(startFlow, endFlow, p1, p2)) {
            edgesToRemove.push(edge.id);
          }
        }
      });

      if (edgesToRemove.length > 0) {
        setEdges(eds => eds.filter(e => !edgesToRemove.includes(e.id)));
      }
      setCutLine(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow-label');
      const value = event.dataTransfer.getData('application/reactflow-value');

      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label, value, number: type === 'component' ? globalNodeCounter++ : undefined },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onClear = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    globalNodeCounter = 1;
  }, [setNodes, setEdges]);

  const onSave = useCallback(() => {
    const flow = reactFlowInstance?.toObject();
    if (flow) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flow, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "prompt_nodes.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }, [reactFlowInstance]);

  const onLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const flow = JSON.parse(event.target?.result as string);
            if (flow && flow.nodes && flow.edges) {
              setNodes(flow.nodes || []);
              setEdges(flow.edges || []);
              
              const maxId = flow.nodes.reduce((max: number, node: any) => {
                if (node.data && node.data.number) {
                  return Math.max(max, node.data.number);
                }
                return max;
              }, 0);
              globalNodeCounter = maxId + 1;
            }
          } catch (err) {
            console.error("Failed to load JSON", err);
            alert("Failed to parse JSON file.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setNodes, setEdges]);

  // Re-calculate the final prompt whenever nodes/edges change
  useEffect(() => {
    // Recursive evaluation function (ComfyUI style)
    const evaluateNode = (nodeId: string, visited: Set<string> = new Set()): string => {
      if (visited.has(nodeId)) return ''; // Prevent circular loops
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) return '';

      // Find incoming edges
      const incomingEdges = edges.filter(e => e.target === nodeId);
      
      // Evaluate all incoming nodes
      const incomingTexts = incomingEdges
        .map(e => evaluateNode(e.source, new Set(visited)))
        .filter(t => t !== '');

      let ownText = '';
      if (node.type === 'inputNode') {
        ownText = node.data?.text as string || '';
      } else if (node.type === 'component') {
        if (node.data?.value) {
          const weight = (node.data?.weight as number) ?? 1.0;
          ownText = weight !== 1.0 ? `(${node.data.value}:${weight.toFixed(1)})` : String(node.data.value);
        }
      } else if (node.type === 'imageVisionNode') {
        ownText = node.data?.text as string || '';
      } else if (node.type === 'mixerNode') {
        const mode = node.data?.mode as string || 'concat';
        if (mode === 'concat') {
          ownText = incomingTexts.join(', ');
        } else if (mode === 'mj') {
          ownText = incomingTexts.join(' ::1 ') + (incomingTexts.length > 0 ? ' ::1' : '');
        } else if (mode === 'sd') {
          ownText = incomingTexts.join(' AND ');
        } else if (mode === 'llm') {
          ownText = node.data?.llmResult as string || '';
          if (!ownText && incomingTexts.length > 0) {
             ownText = '[Pending LLM Merge...]';
          }
        }
        // Mixer Node CONSUMES incoming texts, returning only its own combined text
        return ownText;
      }

      // Default behavior for nodes (Output, Component, Input, Vision, passthrough): Combine incoming with own
      if (node.type === 'paletteNode' || node.type === 'gridNode') {
        // Palette/Grid nodes are a transparent pass-through for the text
        return incomingTexts.join(', ');
      }
      if (incomingTexts.length > 0) {
        if (ownText) return incomingTexts.join(', ') + ', ' + ownText;
        return incomingTexts.join(', ');
      }
      return ownText;
    };

    // Output node is always id '2' initially, but let's find it dynamically
    const outputNode = nodes.find(n => n.type === 'outputNode');
    let finalPrompt = '';
    
    if (outputNode) {
      // Start evaluating from the incoming edges of the output node
      const incomingEdges = edges.filter(e => e.target === outputNode.id);
      const incomingTexts = incomingEdges
        .map(e => evaluateNode(e.source))
        .filter(t => t !== '');
        
      finalPrompt = incomingTexts.join(', ');
    }

    setNodes(nds => {
      let changed = false;
      const newNodes = nds.map(node => {
        if (node.type === 'outputNode' && node.data?.prompt !== finalPrompt) {
          changed = true;
          return { ...node, data: { ...node.data, prompt: finalPrompt } };
        }
        if (node.type === 'paletteNode' || node.type === 'gridNode') {
          const incomingEdges = edges.filter(e => e.target === node.id);
          const incomingTexts = incomingEdges
            .map(e => evaluateNode(e.source))
            .filter(t => t !== '');
          const combinedIncoming = incomingTexts.join(', ');
          if (node.data?.incomingText !== combinedIncoming) {
            changed = true;
            return { ...node, data: { ...node.data, incomingText: combinedIncoming } };
          }
        }
        return node;
      });
      return changed ? newNodes : nds;
    });
  }, [nodes, edges, setNodes]);

  // Connect to backend WebSocket for MCP events
  useEffect(() => {
    let ws: WebSocket | null = null;
    let timeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket('ws://127.0.0.1:3001');

      ws.onopen = () => {
        console.log('Connected to MCP WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'render_pipeline') {
            console.log("Received MCP render_pipeline:", msg.payload);
            
            // Generate nodes based on payload
            const payload = msg.payload;
            const newNodes: Node[] = [];
            
            let currentX = payload.x !== undefined ? payload.x : 350;
            let currentY = payload.y !== undefined ? payload.y : 100;
            
            if (payload.nodes && Array.isArray(payload.nodes)) {
                // New schema handling
                payload.nodes.forEach((item: any, index: number) => {
                  const nodeId = `mcp_gen_${index}_${Date.now()}`;
                  
                  if (item.label === 'Color Palette' || item.label === 'Palette') {
                     // Parse hex codes from value
                     const hexes = typeof item.value === 'string' ? (item.value.match(/#[0-9a-fA-F]{6}/g) || []) : [];
                     newNodes.push({
                        id: nodeId,
                        type: 'paletteNode',
                        position: { x: currentX, y: currentY },
                        data: { colors: hexes, number: globalNodeCounter++ }
                     });
                  } else if (item.label === 'Composition Grid') {
                     let rects = [];
                     try {
                        if (typeof item.value === 'string') {
                           const cleanValue = item.value.replace(/```json/g, '').replace(/```/g, '').trim();
                           rects = JSON.parse(cleanValue);
                           if (!Array.isArray(rects)) rects = [];
                        }
                     } catch (e) {
                        console.error("Failed to parse grid JSON from LLM", e);
                     }
                     newNodes.push({
                        id: nodeId,
                        type: 'gridNode',
                        position: { x: currentX, y: currentY },
                        data: { rects, incomingText: item.value }
                     });
                  } else {
                     const presets = NODE_PRESETS[item.label] || [];
                     const flatPresets = presets.reduce((acc: string[], curr: PresetItem) => {
                       if (typeof curr === 'string') {
                         acc.push(curr);
                       } else {
                         acc.push(...curr.items);
                       }
                       return acc;
                     }, []);
                     const preset = flatPresets.includes(item.value) ? item.value : (item.value ? 'Custom' : 'None');
                     newNodes.push({
                        id: nodeId,
                        type: 'component',
                        position: { x: currentX, y: currentY },
                        data: { label: item.label, value: item.value, preset, weight: item.weight || 1.0, number: globalNodeCounter++ }
                     });
                  }
                  currentY += 120;
                });
            } else {
                // Legacy flat object fallback
                Object.keys(payload).forEach((key, index) => {
                   if (payload[key]) {
                      const nodeId = `mcp_gen_${index}_${Date.now()}`;
                      if (key === 'Color Palette' || key === 'Palette') {
                         const hexes = typeof payload[key] === 'string' ? (payload[key].match(/#[0-9a-fA-F]{6}/g) || []) : [];
                         newNodes.push({
                            id: nodeId,
                            type: 'paletteNode',
                            position: { x: currentX, y: currentY },
                            data: { colors: hexes, number: globalNodeCounter++ }
                         });
                      } else if (key === 'Composition Grid') {
                         let rects = [];
                         try {
                            if (typeof payload[key] === 'string') {
                               const cleanValue = payload[key].replace(/```json/g, '').replace(/```/g, '').trim();
                               rects = JSON.parse(cleanValue);
                               if (!Array.isArray(rects)) rects = [];
                            }
                         } catch (e) {
                            console.error("Failed to parse grid JSON from LLM", e);
                         }
                         newNodes.push({
                            id: nodeId,
                            type: 'gridNode',
                            position: { x: currentX, y: currentY },
                            data: { rects, incomingText: payload[key] }
                         });
                      } else {
                         const presets = NODE_PRESETS[key] || [];
                         const flatPresets = presets.reduce((acc: string[], curr: PresetItem) => {
                           if (typeof curr === 'string') {
                             acc.push(curr);
                           } else {
                             acc.push(...curr.items);
                           }
                           return acc;
                         }, []);
                         const preset = flatPresets.includes(payload[key]) ? payload[key] : (payload[key] ? 'Custom' : 'None');
                         newNodes.push({
                            id: nodeId,
                            type: 'component',
                            position: { x: currentX, y: currentY },
                            data: { label: key, value: payload[key], preset, number: globalNodeCounter++ }
                         });
                      }
                      currentY += 120;
                   }
                });
            }
            
            if (newNodes.length > 0) {
              // Add to existing canvas
              setNodes((nds) => {
                const targetOutputId = nds.find(n => n.type === 'outputNode')?.id || '2';
                const inputNodeId = nds.find(n => n.type === 'inputNode' || n.type === 'imageVisionNode')?.id || '1';
                
                const finalEdges: Edge[] = [];
                newNodes.forEach((node) => {
                  if (payload.sourceId) {
                    finalEdges.push({ id: `e_${payload.sourceId}_${node.id}`, source: payload.sourceId, target: node.id });
                  } else {
                    finalEdges.push({ id: `e_${inputNodeId}_${node.id}`, source: inputNodeId, target: node.id });
                  }
                  finalEdges.push({ id: `e_${node.id}_${targetOutputId}`, source: node.id, target: targetOutputId });
                });

                // Update edges with the fresh node IDs
                setEdges((eds) => {
                  const combinedEdges = [...eds, ...finalEdges];
                  console.log("Updated edges:", combinedEdges);
                  return combinedEdges;
                });
                
                // Return new nodes array
                const combinedNodes = [...nds, ...newNodes];
                console.log("Updated nodes:", combinedNodes);
                return combinedNodes;
              });
            }
          }
        } catch(e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        console.log('WS closed, retrying in 2s...');
        timeout = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(timeout);
      if (ws) {
        ws.onclose = null; // prevent reconnect loop on unmount
        ws.close();
      }
    };
  }, [setNodes, setEdges]);

  return (
    <div className="app-container">
      <Sidebar />
      <div 
        className="flow-container relative" 
        ref={reactFlowWrapper}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          selectionMode={SelectionMode.Partial}
          deleteKeyCode={['Backspace', 'Delete']}
          edgesFocusable={true}
          fitView
          className="bg-background"
        >
          <Background color="var(--border)" gap={16} />
          <MiniMap 
            className="border-border" 
            style={{ backgroundColor: 'var(--card)' }} 
            maskColor="rgba(0,0,0,0.7)" 
            nodeColor="var(--primary)" 
          />
          <Panel position="top-right" className="flex gap-2">
            <button 
              onClick={undo} 
              disabled={!canUndo}
              className="w-8 h-8 bg-card text-foreground hover:bg-muted border border-border rounded-[4px] transition-all flex items-center justify-center disabled:opacity-50"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button 
              onClick={redo} 
              disabled={!canRedo}
              className="w-8 h-8 bg-card text-foreground hover:bg-muted border border-border rounded-[4px] transition-all flex items-center justify-center disabled:opacity-50"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
            
            <button 
              onClick={onClear} 
              className="h-8 px-3 bg-destructive text-destructive-foreground hover:opacity-90 rounded-[4px] transition-all text-[11px] font-medium flex items-center justify-center"
            >
              Clear
            </button>
            <button 
              onClick={onLoad} 
              className="h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-[4px] transition-all flex items-center gap-2 text-[11px] font-medium"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Load JSON
            </button>
            <button 
              onClick={onSave} 
              className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[4px] transition-all flex items-center gap-2 text-[11px] font-medium"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save JSON
            </button>
          </Panel>
        </ReactFlow>
        {cutLine && (
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-50">
            <line 
              x1={cutLine.start.x} y1={cutLine.start.y} 
              x2={cutLine.end.x} y2={cutLine.end.y} 
              stroke="var(--destructive)" strokeWidth="2" strokeDasharray="5,5" 
            />
          </svg>
        )}
      </div>
    </div>
  );
}
