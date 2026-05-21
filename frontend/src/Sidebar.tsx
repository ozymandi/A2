import React from 'react';

const LIBRARY_PRESETS = [
  {
    category: 'Camera & Lenses',
    items: ['Wide Angle', '50mm', 'Macro Lens', 'Drone View', 'GoPro', 'Fisheye']
  },
  {
    category: 'Lighting',
    items: ['Cinematic Lighting', 'Natural Light', 'Volumetric Lighting', 'Studio Lighting', 'Neon Lights', 'Golden Hour']
  },
  {
    category: 'Tools',
    items: ['Custom Node', 'Remark']
  },
  {
    category: 'Style & Medium',
    items: ['Cyberpunk', 'Photorealistic', 'Oil Painting', 'Anime', 'Concept Art', 'Unreal Engine 5', 'Watercolor']
  },
  {
    category: 'Environment',
    items: ['Sci-Fi City', 'Cybernetic Landscape', 'Post-apocalyptic', 'Fantasy Forest', 'Space Station']
  }
];

export function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, value: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.setData('application/reactflow-value', value);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        Prompt Library
      </div>
      <div className="sidebar-content">
        <div className="text-xs text-gray-400 mb-6 italic">
          Drag components onto the canvas to build your prompt pipeline.
        </div>
        
        {LIBRARY_PRESETS.map((preset, idx) => (
          <div key={idx} className="library-section">
            <div className="library-title">{preset.category}</div>
            {preset.items.map((item, itemIdx) => (
              <div 
                key={itemIdx} 
                className="library-item"
                draggable
                onDragStart={(e) => onDragStart(
                  e, 
                  'component', 
                  preset.category === 'Tools' ? item : preset.category.split(' ')[0], 
                  preset.category === 'Tools' ? '' : item
                )}
              >
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
