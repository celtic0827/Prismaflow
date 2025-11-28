import React, { useState } from 'react';
import { Plus, Trash2, Sliders } from './Icons';

interface RandomizerEditorProps {
  options: string[];
  onSave: (newOptions: string[]) => void;
}

export const RandomizerEditor: React.FC<RandomizerEditorProps> = ({ options, onSave }) => {
  const [items, setItems] = useState<string[]>(options);
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      const updated = [...items, newItem.trim()];
      setItems(updated);
      setNewItem('');
      onSave(updated);
    }
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="bg-brand-900/20 p-3 rounded border border-brand-500/30 flex items-center gap-3">
        <Sliders className="text-brand-400" size={18} />
        <p className="text-xs text-brand-200">
          Add options below. Varia will randomly select one when regenerating.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="New option..."
          className="flex-1 bg-canvas-950 border border-canvas-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors placeholder:text-canvas-600"
          autoFocus
        />
        <button
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded transition-all"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {items.length === 0 && (
          <div className="text-center py-6 text-canvas-600 text-xs italic border border-dashed border-canvas-800 rounded">
            No options defined.
          </div>
        )}
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className="group flex items-center justify-between bg-canvas-900 hover:bg-canvas-800 border border-canvas-800 hover:border-canvas-600 rounded px-3 py-2 transition-all"
          >
            <span className="text-sm font-mono text-canvas-200">{item}</span>
            <button
              onClick={() => handleRemove(idx)}
              className="text-canvas-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};