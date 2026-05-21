import { useState, useCallback, useEffect, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';

type HistoryState = {
  nodes: Node[];
  edges: Edge[];
};

export function useUndoRedo(
  initialNodes: Node[],
  initialEdges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
) {
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  
  // Track the current actual state so we don't need to pass it into takeSnapshot manually
  const currentNodesRef = useRef<Node[]>(initialNodes);
  const currentEdgesRef = useRef<Edge[]>(initialEdges);
  
  const isUndoRedoActionRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentNodesRef.current = initialNodes;
  }, [initialNodes]);

  useEffect(() => {
    currentEdgesRef.current = initialEdges;
  }, [initialEdges]);

  const takeSnapshot = useCallback(() => {
    if (isUndoRedoActionRef.current) return;
    
    setPast((p) => [
      ...p,
      {
        nodes: currentNodesRef.current,
        edges: currentEdgesRef.current,
      },
    ]);
    setFuture([]);
  }, []);

  // Debounced snapshot to capture dragging/typing without flooding history
  const takeSnapshotDebounced = useCallback(() => {
    if (isUndoRedoActionRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      takeSnapshot();
    }, 500);
  }, [takeSnapshot]);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    isUndoRedoActionRef.current = true;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture((f) => [
      {
        nodes: currentNodesRef.current,
        edges: currentEdgesRef.current,
      },
      ...f,
    ]);

    setNodes(previous.nodes);
    setEdges(previous.edges);

    // Give react time to render before allowing new snapshots
    setTimeout(() => {
      isUndoRedoActionRef.current = false;
    }, 100);
  }, [past, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    isUndoRedoActionRef.current = true;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast((p) => [
      ...p,
      {
        nodes: currentNodesRef.current,
        edges: currentEdgesRef.current,
      },
    ]);
    setFuture(newFuture);

    setNodes(next.nodes);
    setEdges(next.edges);

    setTimeout(() => {
      isUndoRedoActionRef.current = false;
    }, 100);
  }, [future, setNodes, setEdges]);

  return {
    undo,
    redo,
    takeSnapshot,
    takeSnapshotDebounced,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
