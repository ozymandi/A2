import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Download, RefreshCw, Wand2, Cloud, Server, LayoutTemplate } from 'lucide-react';
import axios from 'axios';

export function VectorOutputNode({ data, isConnectable }: any) {
  const [loading, setLoading] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [engine, setEngine] = useState<'comfy' | 'huggingface'>('comfy');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    // Get text from connected node
    const text = data.text || "";
    if (!text) {
      setError("Please connect a text input node first.");
      return;
    }

    setLoading(true);
    setError(null);
    setSvgContent(null);

    try {
      const response = await axios.post('http://localhost:3001/api/generate-vector', {
        text,
        engine
      });

      if (response.data.svg) {
        setSvgContent(response.data.svg);
      } else {
        setError("Failed to generate SVG. No valid SVG returned.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-output-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-80 bg-gray-900 border-2 border-emerald-500/30 rounded-xl shadow-2xl overflow-hidden text-gray-100 flex flex-col font-sans relative">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-3 h-3 bg-emerald-500 border-gray-900" />
      
      {/* Header */}
      <div className="bg-gray-800/80 px-4 py-3 flex items-center justify-between border-b border-gray-700/50">
        <div className="flex items-center space-x-2">
          <LayoutTemplate className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm tracking-wide text-gray-100">VECTOR OUTPUT</span>
        </div>
        <button 
          onClick={handleGenerate} 
          disabled={loading}
          className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
          title="Generate SVG"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Engine Toggle */}
      <div className="p-3 border-b border-gray-700/50 flex space-x-1 bg-gray-900/50">
        <button
          onClick={() => setEngine('comfy')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
            engine === 'comfy' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
              : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>ComfyUI (Local)</span>
        </button>
        <button
          onClick={() => setEngine('huggingface')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
            engine === 'huggingface' 
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)]' 
              : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>HF Spaces (Cloud)</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col space-y-4">
        
        {/* Render Area */}
        <div className="w-full h-48 bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden relative">
          {loading ? (
            <div className="flex flex-col items-center text-emerald-500/70 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="text-xs font-medium uppercase tracking-wider animate-pulse">
                {engine === 'comfy' ? 'Rendering Locally...' : 'Cloud Rendering... (May take 1-3 mins)'}
              </span>
            </div>
          ) : error ? (
            <div className="text-rose-400 text-xs px-4 text-center">
              {error}
            </div>
          ) : svgContent ? (
            <div 
              className="w-full h-full flex items-center justify-center p-2"
              dangerouslySetInnerHTML={{ __html: svgContent }} 
            />
          ) : (
            <span className="text-gray-600 text-xs italic text-center px-4">
              Connect a prompt and click generate to render SVG
            </span>
          )}
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={!svgContent || loading}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
            svgContent && !loading
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-500/25 border border-emerald-400' 
              : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Download .SVG</span>
        </button>
      </div>
    </div>
  );
}
