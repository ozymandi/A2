import { useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import axios from 'axios';

export function ImageVisionNode({ id, data }: any) {
  const [image, setImage] = useState<string | null>(data.image || null);
  const [text, setText] = useState(data.text || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateNodeData, getNodes } = useReactFlow();

  // Sync internal state to node data
  useEffect(() => {
    updateNodeData(id, { text, image });
  }, [text, image, id, updateNodeData]);

  const handleImageUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      handleImageUpload(e.clipboardData.files[0]);
    }
  }, []);

  const [isDecompiling, setIsDecompiling] = useState(false);

  const analyzeImage = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const res = await axios.post('http://127.0.0.1:3001/api/analyze-image', { image });
      if (res.data && res.data.description) {
        setText(res.data.description);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.error || "Failed to analyze image. Make sure a Vision model is loaded in LM Studio.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const decompileImage = async () => {
    if (!image) return;
    const node = getNodes().find(n => n.id === id);
    if (!node) return;
    
    setIsDecompiling(true);
    try {
      await axios.post('http://127.0.0.1:3001/api/decompile-image', { 
        image, 
        sourceId: id,
        x: node.position.x + 350,
        y: node.position.y
      });
      // The nodes will be created automatically via WebSocket broadcast
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.error || "Failed to decompile image. Make sure a Vision model is loaded in LM Studio.");
    } finally {
      setIsDecompiling(false);
    }
  };

  return (
    <div 
      className="custom-node" style={{ width: '288px' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPaste={onPaste}
      tabIndex={0} // Make focusable for onPaste
    >
      <div className="flex justify-between items-center mb-3">
        <div className="node-header text-primary mb-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Vision Input
        </div>
      </div>

      {!image ? (
        <div 
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-input-background transition-colors mb-3 flex flex-col items-center justify-center min-h-[120px]"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[10px] text-muted-foreground">Click to upload, paste, or drag image</p>
        </div>
      ) : (
        <div className="relative mb-3 group">
          <img src={image} alt="Preview" className="w-full h-auto max-h-[250px] object-contain bg-black/20 rounded-md border border-border" />
          <button 
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => { setImage(null); setText(''); }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={(e) => { if (e.target.files?.length) handleImageUpload(e.target.files[0]); }}
        className="hidden"
      />

      <div className="flex gap-2 mb-3">
        <button 
          onClick={analyzeImage}
          disabled={!image || isAnalyzing || isDecompiling}
          className="btn-primary flex-1 flex justify-center items-center gap-1"
        >
          {isAnalyzing ? (
            <svg className="animate-spin h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          Analyze
        </button>

        <button 
          onClick={decompileImage}
          disabled={!image || isAnalyzing || isDecompiling}
          className="btn-primary flex-1 flex justify-center items-center gap-1"
        >
          {isDecompiling ? (
            <svg className="animate-spin h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          )}
          Decompile
        </button>
      </div>

      <div className="node-content relative">
        <textarea 
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Generated description will appear here..."
        />
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
