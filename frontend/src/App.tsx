import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';

import { InputNode } from './nodes/InputNode';
import { ComponentNode } from './nodes/ComponentNode';
import { OutputNode } from './nodes/OutputNode';
import { Sidebar } from './Sidebar';

const nodeTypes = {
  inputNode: InputNode,
  component: ComponentNode,
  outputNode: OutputNode,
};

const initialNodes: Node[] = [
  { id: '1', type: 'inputNode', position: { x: 50, y: 150 }, data: { text: '' } },
  { id: '2', type: 'outputNode', position: { x: 800, y: 150 }, data: { prompt: '' } },
];
const initialEdges: Edge[] = [];

let id = 0;
const getId = () => `dndnode_${id++}`;
let globalNodeCounter = 1;

export default function App() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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

  // Re-calculate the final prompt whenever nodes/edges change
  useEffect(() => {
    // Use BFS to traverse the graph starting from the Input node to collect components in order
    const getNextNodes = (nodeId: string) => edges.filter(e => e.source === nodeId).map(e => e.target);
    
    const visited = new Set<string>();
    const order: string[] = [];
    
    const queue = ['1']; // start from inputNode
    visited.add('1');
    
    while(queue.length > 0) {
       const curr = queue.shift()!;
       const node = nodes.find(n => n.id === curr);
       if (node && node.type === 'component') {
          if (node.data?.value) {
             const weight = node.data?.weight ?? 1.0;
             if (weight !== 1.0) {
                 order.push(`(${node.data.value}:${weight.toFixed(1)})`);
             } else {
                 order.push(node.data.value);
             }
          }
       }
       
       const nextNodes = getNextNodes(curr);
       for(const next of nextNodes) {
          if (!visited.has(next)) {
             visited.add(next);
             queue.push(next);
          }
       }
    }

    const inputText = nodes.find(n => n.type === 'inputNode')?.data?.text || '';
    
    let finalPrompt = inputText;
    if (order.length > 0) {
      if (finalPrompt) finalPrompt += ', ';
      finalPrompt += order.join(', ');
    }

    setNodes(nds => {
      const outputNode = nds.find(n => n.type === 'outputNode');
      if (outputNode && outputNode.data?.prompt !== finalPrompt) {
        return nds.map(node => {
          if (node.type === 'outputNode') {
            return { ...node, data: { ...node.data, prompt: finalPrompt } };
          }
          return node;
        });
      }
      return nds;
    });
  }, [nodes, edges, setNodes]);

  // Connect to backend WebSocket for MCP events
  useEffect(() => {
    let ws: WebSocket | null = null;
    let timeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket('ws://localhost:3001');

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
            const newEdges: Edge[] = [];
            
            let currentX = 350;
            let currentY = 100;
            
            Object.keys(payload).forEach((key, index) => {
               if (payload[key]) {
                  const nodeId = `mcp_gen_${index}_${Date.now()}`;
                  newNodes.push({
                     id: nodeId,
                     type: 'component',
                     position: { x: currentX, y: currentY },
                     data: { label: key, value: payload[key], number: globalNodeCounter++ }
                  });
                  currentY += 120; // stack them vertically
                  
                  // connect input to first, and all to output
                  newEdges.push({ id: `e_1_${nodeId}`, source: '1', target: nodeId });
                  newEdges.push({ id: `e_${nodeId}_2`, source: nodeId, target: '2' });
               }
            });
            
            if (newNodes.length > 0) {
              // Add to existing canvas
              setNodes((nds) => [...nds, ...newNodes]);
              setEdges((eds) => [...eds, ...newEdges]);
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
      <div className="flow-container" ref={reactFlowWrapper}>
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
          fitView
          className="bg-[#0f1115]"
        >
          <Background color="#333" gap={16} />
          <Controls className="bg-gray-800 border-gray-700 fill-gray-300" />
          <MiniMap className="bg-gray-900 border-gray-700" maskColor="rgba(0,0,0,0.5)" nodeColor="#6366f1" />
        </ReactFlow>
      </div>
    </div>
  );
}
