import React from 'react';
import { Merge, Camera, Palette } from 'lucide-react';

export function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, value: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.setData('application/reactflow-value', value);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar">
      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 px-2">Tools</div>
      
      <div className="space-y-2 mb-6">
        <div 
          className="dndnode flex items-center p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg cursor-grab hover:bg-indigo-500/20 transition-all text-sm font-medium text-indigo-400 group"
          onDragStart={(event) => onDragStart(event, 'mixerNode', 'Mixer', '')}
          draggable
        >
          <Merge className="w-4 h-4 mr-3 opacity-70 group-hover:opacity-100" />
          Prompt Mixer
        </div>
        
        <div 
          className="dndnode flex items-center p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg cursor-grab hover:bg-purple-500/20 transition-all text-sm font-medium text-purple-400 group"
          onDragStart={(event) => onDragStart(event, 'imageVisionNode', 'Base Input', '')}
          draggable
        >
          <Camera className="w-4 h-4 mr-3 opacity-70 group-hover:opacity-100" />
          Image Vision
        </div>

        <div 
          className="dndnode flex items-center p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-grab hover:bg-blue-500/20 transition-all text-sm font-medium text-blue-400 group"
          onDragStart={(event) => onDragStart(event, 'paletteNode', 'Color Palette', '')}
          draggable
        >
          <Palette className="w-4 h-4 mr-3 opacity-70 group-hover:opacity-100" />
          Color Palette
        </div>
      </div>

      <div className="sidebar-header">
        Prompt Library
      </div>
      <div className="sidebar-content">
        <div className="text-xs text-gray-400 mb-6 italic">
          Drag components onto the canvas to build your prompt pipeline.
        </div>
        
        <h3 className="library-title mt-2">Basic Nodes</h3>
        <div 
          className="library-item mb-4 flex items-center gap-2"
          draggable
          onDragStart={(e) => onDragStart(e, 'component', 'Subject', '')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="font-medium text-sm">Subject Node</span>
        </div>

        <h3 className="library-title mt-6">Vision Inputs</h3>
        <div 
          className="library-item mb-6 flex items-center gap-2"
          draggable
          onDragStart={(e) => onDragStart(e, 'imageVisionNode', 'Image', '')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="font-medium text-sm">Image Vision</span>
        </div>

        <h3 className="library-title mt-6">Mixers & Logic</h3>
        <div 
          className="library-item mb-6 flex items-center gap-2"
          draggable
          onDragStart={(e) => onDragStart(e, 'mixerNode', 'Mixer', '')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span className="font-medium text-sm">Mixer Node</span>
        </div>
        <h3 className="library-title mt-6">Mother Nodes</h3>
        <div className="library-section">
          {['Camera', 'Lighting', 'Style', 'Environment', 'Artist', 'Aspect Ratio', 'Custom'].map((nodeType) => (
            <div 
              key={nodeType}
              className="library-item flex items-center gap-2"
              draggable
              onDragStart={(e) => onDragStart(e, 'component', nodeType, '')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
              <span className="font-medium text-sm">{nodeType} Node</span>
            </div>
          ))}
        </div>

        <h3 className="library-title mt-6">Person Attributes</h3>
        <div className="library-section">
          {['Age', 'Gender', 'Race'].map((nodeType) => (
            <div 
              key={nodeType}
              className="library-item flex items-center gap-2"
              draggable
              onDragStart={(e) => onDragStart(e, 'component', nodeType, '')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-medium text-sm">{nodeType} Node</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
